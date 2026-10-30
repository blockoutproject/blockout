package com.blockout.backend.search.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.generated.mobile.model.ContactModeEnum;
import com.blockout.backend.search.application.ProjectSearch;
import com.blockout.backend.search.application.SearchDocuments;
import com.blockout.backend.search.application.SearchEngine;
import com.blockout.backend.search.application.SearchUnavailableException;
import com.blockout.backend.sporting.application.SportingProjectionChanges;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactEdit;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactField;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.service.ChangeClubContacts;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import com.blockout.backend.sporting.application.service.RestrictClubContacts;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.opensearch.client.opensearch.OpenSearchClient;
import org.opensearch.client.opensearch.core.BulkRequest;
import org.opensearch.client.opensearch.indices.OpenSearchIndicesClient;
import org.opensearch.client.opensearch.indices.RefreshRequest;
import org.opensearch.client.opensearch.indices.UpdateAliasesRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Migrated PostgreSQL, F02 event/read owners and real TLS engine; all indexes are synthetic. */
@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Import({
  PostgresTestConfiguration.class,
  SearchProjectionIntegrationTest.ProjectionConfiguration.class
})
@DisplayName("Native search projection lifecycle")
class SearchProjectionIntegrationTest {
  @Autowired private PostgreSQLContainer database;
  private static final String PREFIX = "blockout-local-search-issue220";
  private static final UUID CLUB = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private static final UUID TEAM = UUID.fromString("00000000-0000-4000-8000-000000000050");
  private static final UUID POOL = UUID.fromString("00000000-0000-4000-8000-000000000040");
  private static final UUID DIVISION = UUID.fromString("00000000-0000-4000-8000-000000000020");
  @Autowired SearchTestEngine nativeEngine;
  @Autowired JdbcTemplate sql;
  @Autowired PlatformTransactionManager transactions;
  @Autowired SportingProjectionChanges changes;
  @Autowired ReadSportingData sporting;
  @Autowired ProjectSearch projection;
  @Autowired OpenSearchProjectionWriter writer;
  @Autowired ThreadPoolTaskScheduler tasks;
  @Autowired MockMvc mvc;
  @Autowired JsonMapper json;
  @Autowired ChangeClubContacts contacts;
  @Autowired RestrictClubContacts restrictions;

  /**
   * Stops background work before the owned Spring context closes its infrastructure.
   *
   * @param scheduler this class's single projection worker, also closed by its Spring context
   */
  @org.junit.jupiter.api.AfterAll
  static void stopProjectionTasks(@Autowired ThreadPoolTaskScheduler scheduler) {
    scheduler.shutdown();
  }

  /** Resets only this suite's disposable SQL state and publishes a clean empty generation. */
  @BeforeEach
  void fixture() throws Exception {
    drain();
    assertThat(aliases()).hasSize(3);
    try (java.sql.Connection connection =
            java.sql.DriverManager.getConnection(
                database.getJdbcUrl().replace("/postgres", "/blockout"),
                "blockout_migration",
                "harmless-migration");
        java.sql.Statement statement = connection.createStatement()) {
      statement.execute("TRUNCATE sporting_season, sporting_club, sporting_division CASCADE");
    }
    full();
    sql.update(
        "INSERT INTO sporting_club(id, provider, reference, source_name, municipality) VALUES (?, 'FFVB', '220-club', 'Original club', 'Lyon')",
        CLUB);
  }

  @Test
  @DisplayName("Publishes committed names while rollback leaves the usable document unchanged")
  void distinguishesCommitFromRollback() throws Exception {
    // Given
    full();
    TransactionTemplate transaction = new TransactionTemplate(transactions);

    // When
    transaction.executeWithoutResult(
        status -> {
          sql.update("UPDATE sporting_club SET source_name = 'Rolled back' WHERE id = ?", CLUB);
          changes.submit(SportingProjectionChanges.Kind.CLUB, CLUB);
          status.setRollbackOnly();
        });
    drain();

    // Then
    assertThat(document("clubs", CLUB).names())
        .contains("Original club")
        .doesNotContain("Rolled back");

    // When
    transaction.executeWithoutResult(
        status -> {
          sql.update("UPDATE sporting_club SET source_name = 'Committed club' WHERE id = ?", CLUB);
          changes.submit(SportingProjectionChanges.Kind.CLUB, CLUB);
        });
    drain();

    // Then
    assertThat(document("clubs", CLUB).names()).containsExactly("Committed club");
  }

  @ParameterizedTest
  @ValueSource(strings = {"clubs", "teams", "pools"})
  @DisplayName("Finds current F02 names and context through native matching and F03 HTTP summaries")
  void matchesOwnerFields(String resource) throws Exception {
    // Given
    participation();
    sql.update("UPDATE sporting_club SET manual_name = 'Étoile Volley' WHERE id = ?", CLUB);
    sql.update(
        "UPDATE sporting_team SET manual_name = 'Comets', manual_short_name = 'teamshort' WHERE id = ?",
        TEAM);
    sql.update(
        "UPDATE sporting_pool SET manual_name = 'Nebula', manual_short_name = 'poolshort' WHERE id = ?",
        POOL);
    sql.update("INSERT INTO sporting_division_term(division_id, term) VALUES (?, 'N2')", DIVISION);
    UUID season = UUID.fromString("00000000-0000-4000-8000-000000000010");
    sql.update(
        "INSERT INTO sporting_club_alias(club_id, season_id, organizer_reference, competition_reference, comparison_name) VALUES (?, ?, 'synthetic', 'competition', 'clubalias')",
        CLUB,
        season);
    sql.update(
        "INSERT INTO sporting_team_alias(team_id, season_id, organizer_reference, competition_reference, comparison_name) VALUES (?, ?, 'synthetic', 'competition', 'teamalias')",
        TEAM,
        season);
    sql.update(
        "INSERT INTO sporting_pool_alias(pool_id, season_id, organizer_reference, competition_reference, comparison_name) VALUES (?, ?, 'synthetic', 'competition', 'poolalias')",
        POOL,
        season);
    UUID otherDivision = UUID.fromString("00000000-0000-4000-8000-000000000021");
    UUID otherPool = UUID.fromString("00000000-0000-4000-8000-000000000041");
    UUID otherTeam = UUID.fromString("00000000-0000-4000-8000-000000000051");
    sql.update(
        "INSERT INTO sporting_division(id, name, active, color) VALUES (?, 'Regional witnesses', TRUE, '#445566')",
        otherDivision);
    sql.update(
        "INSERT INTO sporting_pool(id, season_id, pack_id, provider, organizer_reference, competition_reference, reference, source_name, division_id, format, gender) SELECT ?, season_id, pack_id, provider, organizer_reference, competition_reference, '224-witness-pool', 'Witness pool', ?, '_4X4', 'MALE' FROM sporting_pool WHERE id = ?",
        otherPool,
        otherDivision,
        POOL);
    sql.update(
        "INSERT INTO sporting_team(id, season_id, provider, organizer_reference, competition_reference, native_reference, source_name, comparison_name, division_id, format, gender) SELECT ?, season_id, provider, organizer_reference, competition_reference, '224-witness-team', 'Witness team', 'witness team', ?, '_4X4', 'MALE' FROM sporting_team WHERE id = ?",
        otherTeam,
        otherDivision,
        TEAM);
    sql.update(
        "INSERT INTO sporting_participation(id, team_id, pool_id, current) VALUES (?, ?, ?, TRUE)",
        UUID.fromString("00000000-0000-4000-8000-000000000071"),
        otherTeam,
        otherPool);
    full();
    UUID expected =
        switch (resource) {
          case "clubs" -> CLUB;
          case "teams" -> TEAM;
          case "pools" -> POOL;
          default -> throw new IllegalArgumentException();
        };
    String identity = resource.substring(0, resource.length() - 1);
    List<String> terms =
        switch (resource) {
          case "clubs" -> List.of("Original club", "ÉTOILE", "eto", "clubalias", "Lyon");
          case "teams" ->
              List.of(
                  "Eagles",
                  "Comets",
                  "teamshort",
                  "teamalias",
                  "Étoile Volley",
                  "Lyon",
                  "Original division",
                  "N2",
                  "féminin",
                  "6x6",
                  "teamalias Lyon N2 feminin 6x6");
          case "pools" ->
              List.of(
                  "Synthetic pool",
                  "Nebula",
                  "poolshort",
                  "poolalias",
                  "Original division",
                  "N2",
                  "féminin",
                  "6x6",
                  "poolalias N2 feminin 6x6");
          default -> throw new IllegalArgumentException();
        };

    // When
    for (String term : terms) {
      JsonNode matches = results(resource, term);

      // Then
      assertThat(matches.size()).as("%s matching %s", resource, term).isEqualTo(1);
      assertThat(matches.get(0).path(identity).path("id").asText()).isEqualTo(expected.toString());
      assertThat(matches.get(0).path(identity).path("name").asText())
          .isEqualTo(
              switch (resource) {
                case "clubs" -> "Étoile Volley";
                case "teams" -> "Comets";
                case "pools" -> "Nebula";
                default -> throw new IllegalArgumentException();
              });
    }
    assertThat(results("teams", "Witness").get(0).path("team").path("id").asText())
        .isEqualTo(otherTeam.toString());
    assertThat(results("pools", "Witness").get(0).path("pool").path("id").asText())
        .isEqualTo(otherPool.toString());
    assertThat(results("clubs", "N2").isEmpty()).isTrue();
    assertThat(results("pools", "Lyon").isEmpty()).isTrue();
  }

  @ParameterizedTest
  @ValueSource(strings = {"corrected", "absent", "restricted"})
  @DisplayName("Current city decisions win in HTTP before queued projection catch-up")
  void enforcesCityBeforeCatchUp(String decision) throws Exception {
    // Given
    participation();
    full();
    UUID operator = UUID.fromString("00000000-0000-4000-8000-000000000224");
    sql.update("DELETE FROM account WHERE id = ?", operator);
    sql.update(
        "INSERT INTO account(id, issuer, subject, username, email) VALUES (?, 'https://identity.example.invalid/', 'auth0|search224', 'Search_224', 'search224@example.invalid')",
        operator);
    sql.update(
        "INSERT INTO account_permission(account_id, permission) VALUES (?, 'sporting-presentation.manage')",
        operator);
    assertThat(results("clubs", "Lyon").size()).isEqualTo(1);
    assertThat(results("teams", "Eagles Lyon").size()).isEqualTo(1);
    CountDownLatch blocked = new CountDownLatch(1);
    CountDownLatch release = new CountDownLatch(1);
    tasks.execute(
        () -> {
          blocked.countDown();
          try {
            if (!release.await(20, TimeUnit.SECONDS))
              throw new IllegalStateException("Fixture gate expired");
          } catch (InterruptedException failure) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(failure);
          }
        });
    try {
      assertThat(blocked.await(5, TimeUnit.SECONDS)).isTrue();

      // When
      if (decision.equals("restricted")) restrictions.restrict(CLUB, Set.of(ContactField.CITY));
      else
        contacts.correct(
            operator,
            CLUB,
            "0",
            Map.of(
                ContactField.CITY,
                new ContactEdit(
                    decision.equals("corrected") ? ContactModeEnum.MANUAL : ContactModeEnum.HIDDEN,
                    decision.equals("corrected") ? "Paris" : null)));

      // Then
      assertThat(document("clubs", CLUB).city()).isEqualTo("Lyon");
      assertThat(document("teams", TEAM).city()).isEqualTo("Lyon");
      assertThat(results("clubs", "Lyon").isEmpty()).isTrue();
      assertThat(results("teams", "Lyon").isEmpty()).isTrue();
      assertThat(results("clubs", "Original").isEmpty()).isTrue();
      assertThat(results("teams", "Eagles").isEmpty()).isTrue();
    } finally {
      release.countDown();
      drain();
    }

    // When
    JsonNode clubs = results("clubs", "Original");
    JsonNode teams = results("teams", "Eagles");

    // Then
    assertThat(clubs.size()).isEqualTo(1);
    assertThat(teams.size()).isEqualTo(1);
    assertThat(clubs.get(0).path("club").path("id").asText()).isEqualTo(CLUB.toString());
    assertThat(teams.get(0).path("team").path("id").asText()).isEqualTo(TEAM.toString());
    assertThat(results("clubs", "Lyon").isEmpty()).isTrue();
    assertThat(results("teams", "Lyon").isEmpty()).isTrue();
    if (decision.equals("corrected")) {
      assertThat(clubs.get(0).path("city").asText()).isEqualTo("Paris");
      assertThat(results("clubs", "Paris").size()).isEqualTo(1);
      assertThat(results("teams", "Paris").size()).isEqualTo(1);
    } else assertThat(clubs.get(0).hasNonNull("city")).isFalse();
  }

  @Test
  @DisplayName("Changed source names and verified aliases converge without keeping name history")
  void convergesNamesAndAliases() throws Exception {
    // Given
    participation();
    sql.update("UPDATE sporting_team SET manual_name = 'Comets' WHERE id = ?", TEAM);
    sql.update(
        "INSERT INTO sporting_team_alias(team_id, season_id, organizer_reference, competition_reference, comparison_name) SELECT id, season_id, organizer_reference, competition_reference, 'nightbirds' FROM sporting_team WHERE id = ?",
        TEAM);
    full();
    assertThat(results("teams", "Eagles nightbirds").size()).isEqualTo(1);

    // When
    new TransactionTemplate(transactions)
        .executeWithoutResult(
            status -> {
              sql.update("UPDATE sporting_team SET source_name = 'Falcons' WHERE id = ?", TEAM);
              sql.update(
                  "UPDATE sporting_team_alias SET comparison_name = 'constellation' WHERE team_id = ?",
                  TEAM);
              changes.submit(SportingProjectionChanges.Kind.TEAM, TEAM);
            });
    drain();
    JsonNode current = results("teams", "Falcons constellation");

    // Then
    assertThat(current.size()).isEqualTo(1);
    assertThat(current.get(0).path("team").path("id").asText()).isEqualTo(TEAM.toString());
    assertThat(current.get(0).path("team").path("name").asText()).isEqualTo("Comets");
    assertThat(results("teams", "Eagles").isEmpty()).isTrue();
    assertThat(results("teams", "nightbirds").isEmpty()).isTrue();
  }

  @Test
  @DisplayName("Queued updates reread the latest committed state after a serialized full rebuild")
  void rereadsQueuedChanges() throws Exception {
    // Given
    full();
    CountDownLatch blocked = new CountDownLatch(1);
    CountDownLatch release = new CountDownLatch(1);
    tasks.execute(
        () -> {
          blocked.countDown();
          try {
            assertThat(release.await(15, TimeUnit.SECONDS)).isTrue();
          } catch (InterruptedException failure) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(failure);
          }
        });
    assertThat(blocked.await(5, TimeUnit.SECONDS)).isTrue();
    CompletableFuture<Void> rebuild = new CompletableFuture<>();
    tasks.execute(
        () -> {
          try {
            projection.rebuild();
            rebuild.complete(null);
          } catch (RuntimeException failure) {
            rebuild.completeExceptionally(failure);
          }
        });

    // When
    try {
      new TransactionTemplate(transactions)
          .executeWithoutResult(
              status -> {
                sql.update(
                    "UPDATE sporting_club SET source_name = 'Intermediate club' WHERE id = ?",
                    CLUB);
                changes.submit(SportingProjectionChanges.Kind.CLUB, CLUB);
              });
      new TransactionTemplate(transactions)
          .executeWithoutResult(
              status -> {
                sql.update(
                    "UPDATE sporting_club SET source_name = 'Latest club' WHERE id = ?", CLUB);
                changes.submit(SportingProjectionChanges.Kind.CLUB, CLUB);
              });
      assertThat(document("clubs", CLUB).names()).containsExactly("Original club");
    } finally {
      release.countDown();
    }
    rebuild.get(15, TimeUnit.SECONDS);
    drain();

    // Then
    assertThat(document("clubs", CLUB).names()).containsExactly("Latest club");
  }

  @Test
  @DisplayName(
      "Club, division and participation scopes update or delete their actual F02 dependents")
  void updatesDependentScopes() throws Exception {
    // Given
    participation();
    full();

    // When
    new TransactionTemplate(transactions)
        .executeWithoutResult(
            status -> {
              sql.update(
                  "UPDATE sporting_club SET source_name = 'Renamed owner' WHERE id = ?", CLUB);
              changes.submit(SportingProjectionChanges.Kind.CLUB, CLUB);
              sql.update(
                  "UPDATE sporting_division SET name = 'New division' WHERE id = ?", DIVISION);
              changes.submit(SportingProjectionChanges.Kind.DIVISION, DIVISION);
            });
    drain();

    // Then
    assertThat(document("teams", TEAM).context()).contains("Renamed owner", "New division");
    assertThat(document("pools", POOL).context()).contains("New division");

    // When
    new TransactionTemplate(transactions)
        .executeWithoutResult(
            status -> {
              sql.update(
                  "UPDATE sporting_participation SET current = FALSE WHERE team_id = ?", TEAM);
              changes.submit(SportingProjectionChanges.Kind.POOL, POOL);
            });
    drain();

    // Then
    assertThat(
            nativeEngine
                .client
                .exists(request -> request.index(PREFIX + "-teams").id(TEAM.toString()))
                .value())
        .isFalse();
  }

  @Test
  @DisplayName("A full run catches up SQL changes that had no in-memory submission")
  void catchesLostWork() throws Exception {
    // Given
    full();
    Map<String, ?> before = aliases();
    sql.update("UPDATE sporting_club SET source_name = 'Recovered name' WHERE id = ?", CLUB);

    // When
    full();

    // Then
    assertThat(aliases().keySet()).doesNotContainAnyElementsOf(before.keySet());
    assertThat(document("clubs", CLUB).names()).containsExactly("Recovered name");
    assertThat(
            nativeEngine
                .client
                .search(request -> request.index(PREFIX + "-clubs"), SearchDocuments.class)
                .hits()
                .hits())
        .singleElement()
        .satisfies(hit -> assertThat(hit.source().names()).contains("Recovered name"));
  }

  @Test
  @DisplayName("Failed native bulk items leave every previous resource alias usable")
  void preservesAliasesOnFailedItem() throws Exception {
    // Given
    full();
    Map<String, ?> before = aliases();
    Map<Kind, String> candidate = writer.createGeneration();
    nativeEngine.client.indices().delete(request -> request.index(candidate.get(Kind.CLUB)));
    nativeEngine
        .client
        .indices()
        .create(
            request ->
                request
                    .index(candidate.get(Kind.CLUB))
                    .mappings(
                        mapping ->
                            mapping.properties(
                                "city", property -> property.integer(integer -> integer))));
    OpenSearchProjectionWriter failedWriter = spy(writer);
    org.mockito.Mockito.doReturn(candidate).when(failedWriter).createGeneration();
    ProjectSearch failedProjection = new ProjectSearch(sporting, failedWriter);

    // When
    Throwable failure =
        org.assertj.core.api.Assertions.catchThrowable(
            () -> tasks.submit(failedProjection::rebuild).get(20, TimeUnit.SECONDS));

    // Then
    assertThat(failure).hasCauseInstanceOf(SearchUnavailableException.class);
    assertThat(aliases().keySet()).containsExactlyInAnyOrderElementsOf(before.keySet());
    assertThat(document("clubs", CLUB).city()).isEqualTo("Lyon");
    assertThat(
            nativeEngine
                .client
                .indices()
                .exists(request -> request.index(candidate.get(Kind.CLUB)))
                .value())
        .isTrue();
    full();
    assertThat(
            nativeEngine
                .client
                .indices()
                .exists(request -> request.index(candidate.get(Kind.CLUB)))
                .value())
        .isFalse();
  }

  @Test
  @DisplayName("An unavailable refresh preserves the preceding complete generation")
  void preservesAliasesOnFailedRefresh() throws Exception {
    // Given
    full();
    Map<String, ?> before = aliases();
    Map<Kind, String> candidate = writer.createGeneration();
    OpenSearchIndicesClient indices = spy(nativeEngine.client.indices());
    doThrow(new IOException("synthetic lost refresh"))
        .when(indices)
        .refresh(any(RefreshRequest.class));
    OpenSearchClient controlled = mock(OpenSearchClient.class);
    when(controlled.indices()).thenReturn(indices);
    OpenSearchProjectionWriter failed =
        new OpenSearchProjectionWriter(controlled, new SearchIndexProperties(PREFIX));

    // When
    Throwable failure =
        org.assertj.core.api.Assertions.catchThrowable(() -> failed.publish(candidate));

    // Then
    assertThat(failure).isInstanceOf(SearchUnavailableException.class);
    writer.cleanup();
    assertThat(aliases().keySet()).containsExactlyInAnyOrderElementsOf(before.keySet());
    assertThat(document("clubs", CLUB).names()).containsExactly("Original club");
  }

  @Test
  @DisplayName(
      "A lost alias acknowledgement reports failure while already-published aliases remain usable")
  void reportsUncertainAliasOutcome() throws Exception {
    // Given
    full();
    Map<Kind, String> candidate = writer.createGeneration();
    tasks
        .submit(
            () ->
                writer.write(
                    candidate.get(Kind.CLUB),
                    List.of(
                        new SearchDocuments(
                            CLUB,
                            List.of("Replacement"),
                            List.of(),
                            null,
                            null,
                            null,
                            null,
                            null))))
        .get(10, TimeUnit.SECONDS);
    OpenSearchIndicesClient indices = spy(nativeEngine.client.indices());
    doAnswer(
            invocation -> {
              invocation.callRealMethod();
              throw new IOException("synthetic lost acknowledgement");
            })
        .when(indices)
        .updateAliases(any(UpdateAliasesRequest.class));
    OpenSearchClient controlled = mock(OpenSearchClient.class);
    when(controlled.indices()).thenReturn(indices);
    OpenSearchProjectionWriter uncertain =
        new OpenSearchProjectionWriter(controlled, new SearchIndexProperties(PREFIX));

    // When
    Throwable failure =
        org.assertj.core.api.Assertions.catchThrowable(() -> uncertain.publish(candidate));

    // Then
    assertThat(failure).isInstanceOf(SearchUnavailableException.class);
    assertThat(aliases().keySet()).containsExactlyInAnyOrderElementsOf(candidate.values());
    assertThat(document("clubs", CLUB).names()).containsExactly("Replacement");
  }

  @Test
  @DisplayName("Preserves candidates when a timed-out alias request applies after the state reread")
  void preservesInFlightCandidates() throws Exception {
    // Given
    full();
    sql.update("UPDATE sporting_club SET source_name = 'Pending replacement' WHERE id = ?", CLUB);
    Map<Kind, String> candidate = writer.createGeneration();
    java.util.concurrent.atomic.AtomicReference<UpdateAliasesRequest> pending =
        new java.util.concurrent.atomic.AtomicReference<>();
    OpenSearchIndicesClient indices = spy(nativeEngine.client.indices());
    doAnswer(
            invocation -> {
              pending.set(invocation.getArgument(0));
              throw new IOException("synthetic alias request still in flight");
            })
        .when(indices)
        .updateAliases(any(UpdateAliasesRequest.class));
    OpenSearchClient controlled = mock(OpenSearchClient.class);
    when(controlled.indices()).thenReturn(indices);
    OpenSearchProjectionWriter uncertain =
        new OpenSearchProjectionWriter(controlled, new SearchIndexProperties(PREFIX));
    OpenSearchProjectionWriter delayed = spy(writer);
    org.mockito.Mockito.doReturn(candidate).when(delayed).createGeneration();
    doAnswer(
            invocation -> {
              uncertain.publish(invocation.getArgument(0));
              return null;
            })
        .when(delayed)
        .publish(any());
    ProjectSearch delayedProjection = new ProjectSearch(sporting, delayed);

    // When
    Throwable failure =
        org.assertj.core.api.Assertions.catchThrowable(
            () -> tasks.submit(delayedProjection::rebuild).get(20, TimeUnit.SECONDS));
    // The native operation completes after the application has reread the still-old state.
    nativeEngine.client.indices().updateAliases(pending.get());

    // Then
    assertThat(failure).hasCauseInstanceOf(SearchUnavailableException.class);
    assertThat(aliases().keySet()).containsExactlyInAnyOrderElementsOf(candidate.values());
    assertThat(document("clubs", CLUB).names()).containsExactly("Pending replacement");
    full();
    assertThat(document("clubs", CLUB).names()).containsExactly("Pending replacement");
    assertThat(
            nativeEngine
                .client
                .indices()
                .exists(request -> request.index(candidate.get(Kind.CLUB)))
                .value())
        .isFalse();
  }

  @Test
  @DisplayName("An interrupted alias request preserves the old usable aliases")
  void preservesUncertainOldAliases() throws Exception {
    // Given
    full();
    Map<String, ?> before = aliases();
    Map<Kind, String> candidate = writer.createGeneration();
    OpenSearchIndicesClient indices = spy(nativeEngine.client.indices());
    doThrow(new IOException("synthetic interrupted alias request"))
        .when(indices)
        .updateAliases(any(UpdateAliasesRequest.class));
    OpenSearchClient controlled = mock(OpenSearchClient.class);
    when(controlled.indices()).thenReturn(indices);
    OpenSearchProjectionWriter uncertain =
        new OpenSearchProjectionWriter(controlled, new SearchIndexProperties(PREFIX));

    // When
    Throwable failure =
        org.assertj.core.api.Assertions.catchThrowable(() -> uncertain.publish(candidate));

    // Then
    assertThat(failure).isInstanceOf(SearchUnavailableException.class);
    uncertain.cleanup();
    assertThat(aliases().keySet()).containsExactlyInAnyOrderElementsOf(before.keySet());
    assertThat(document("clubs", CLUB).names()).containsExactly("Original club");
  }

  @Test
  @DisplayName(
      "Cleanup removes at most twelve unaliased owned generations and preserves unrelated indexes")
  void boundsOwnedCleanup() throws Exception {
    // Given
    String unrelated = PREFIX + "-unrelated";
    String other = "blockout-local-search-other-220-clubs-g-" + UUID.randomUUID();
    nativeEngine.createIndex(unrelated);
    nativeEngine.createIndex(other);
    for (int generation = 0; generation < 5; generation++) writer.createGeneration();

    // When
    writer.cleanup();

    // Then
    assertThat(
            nativeEngine
                .client
                .indices()
                .getAlias(request -> request.index(PREFIX + "-*-g-*"))
                .result())
        .hasSize(6);
    assertThat(
            nativeEngine
                .client
                .indices()
                .exists(request -> request.index(unrelated, other))
                .value())
        .isTrue();
    assertThat(aliases()).hasSize(3);
    writer.cleanup();
    nativeEngine.client.indices().delete(request -> request.index(unrelated, other));
  }

  /** Waits for prior work on the actual single scheduler without adding a second executor. */
  private void drain() throws Exception {
    tasks.submit(() -> {}).get(20, TimeUnit.SECONDS);
  }

  /** Executes the real complete rebuild on the serving scheduler and propagates failures. */
  private void full() throws Exception {
    tasks.submit(projection::rebuild).get(30, TimeUnit.SECONDS);
  }

  /**
   * Reads the actual generated HTTP boundary, including current owner hydration and mapping.
   *
   * @param resource clubs, teams or pools
   * @param text nonempty complete native query
   * @return the public collection after no-store and successful-response checks
   */
  private JsonNode results(String resource, String text) throws Exception {
    return json.readTree(
            mvc.perform(get("/" + resource).param("q", text))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andReturn()
                .getResponse()
                .getContentAsString())
        .path(resource);
  }

  /**
   * Reads the current native alias document for the explicit fixture identity.
   *
   * @param resource clubs, teams or pools
   * @param id current fixture identity
   * @return native serialized document
   */
  private SearchDocuments document(String resource, UUID id) throws Exception {
    return nativeEngine
        .client
        .get(
            request -> request.index(PREFIX + "-" + resource).id(id.toString()),
            SearchDocuments.class)
        .source();
  }

  /**
   * Reads all current native resource aliases without fabricating publication state.
   *
   * @return exact current alias targets in this suite's owned namespace
   */
  private Map<String, ?> aliases() throws Exception {
    return nativeEngine
        .client
        .indices()
        .getAlias(
            request ->
                request
                    .index(PREFIX + "-*")
                    .name(PREFIX + "-clubs", PREFIX + "-teams", PREFIX + "-pools"))
        .result();
  }

  /** Creates one currently viewable seasonal team/pool with an attached club and division. */
  private void participation() {
    UUID season = UUID.fromString("00000000-0000-4000-8000-000000000010");
    UUID pack = UUID.fromString("00000000-0000-4000-8000-000000000030");
    sql.update(
        "INSERT INTO sporting_season(id, start_year, label) VALUES (?, 2026, '2026/2027')", season);
    sql.update(
        "INSERT INTO sporting_division(id, name, active, color) VALUES (?, 'Original division', TRUE, '#112233')",
        DIVISION);
    sql.update(
        "INSERT INTO sporting_pack(id, season_id, provider, organizer_reference, reference) VALUES (?, ?, 'LNV', 'synthetic', '220-pack')",
        pack,
        season);
    sql.update(
        "INSERT INTO sporting_pool(id, season_id, pack_id, provider, organizer_reference, competition_reference, reference, source_name, division_id, format, gender) VALUES (?, ?, ?, 'LNV', 'synthetic', 'competition', '220-pool', 'Synthetic pool', ?, '_6X6', 'FEMALE')",
        POOL,
        season,
        pack,
        DIVISION);
    sql.update(
        "INSERT INTO sporting_team(id, season_id, provider, organizer_reference, competition_reference, native_reference, source_name, comparison_name, club_id, division_id, format, gender) VALUES (?, ?, 'LNV', 'synthetic', 'competition', '220-team', 'Eagles', 'eagles', ?, ?, '_6X6', 'FEMALE')",
        TEAM,
        season,
        CLUB,
        DIVISION);
    sql.update(
        "INSERT INTO sporting_participation(id, team_id, pool_id, current) VALUES (?, ?, ?, TRUE)",
        UUID.fromString("00000000-0000-4000-8000-000000000070"),
        TEAM,
        POOL);
  }

  /** Wires actual owner reads, the native writer and one scheduler; no remote search is enabled. */
  @TestConfiguration(proxyBeanMethods = false)
  static class ProjectionConfiguration {
    /** Starts one engine owned and closed by this Spring context, including startup failure. */
    @Bean(initMethod = "startEngine", destroyMethod = "close")
    SearchTestEngine nativeEngine() {
      return new SearchTestEngine();
    }

    /**
     * Uses this suite's actual native aliases for the production HTTP read path.
     *
     * @param nativeEngine context-owned TLS engine also used by projection writes
     * @return native candidate adapter; SQL hydration and HTTP mapping remain production beans
     */
    @Bean
    @Primary
    SearchEngine searchEngine(SearchTestEngine nativeEngine) {
      return new OpenSearchEngine(nativeEngine.client, new SearchIndexProperties(PREFIX));
    }

    /**
     * Wraps the native writer solely to observe its transaction and thread boundary.
     *
     * @param nativeEngine context-owned real TLS engine
     * @return real writer with a spy asserting that every bulk call is outside SQL
     */
    @Bean
    OpenSearchProjectionWriter writer(SearchTestEngine nativeEngine) throws IOException {
      OpenSearchClient client = spy(nativeEngine.client);
      doAnswer(
              invocation -> {
                assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
                assertThat(Thread.currentThread().getName()).startsWith("issue220-search-");
                return invocation.callRealMethod();
              })
          .when(client)
          .bulk(any(BulkRequest.class));
      return new OpenSearchProjectionWriter(client, new SearchIndexProperties(PREFIX));
    }

    /**
     * Builds the production projection owner with real current SQL reads.
     *
     * @param sporting real current SQL owner
     * @param writer real native generation writer
     * @return actual projection use cases
     */
    @Bean
    ProjectSearch projection(ReadSportingData sporting, OpenSearchProjectionWriter writer) {
      return new ProjectSearch(sporting, writer);
    }

    /**
     * Provides one native scheduler shared by startup and after-commit projection work.
     *
     * @return one context-owned native scheduler, automatically shut down by Spring
     */
    @Bean
    ThreadPoolTaskScheduler tasks() {
      ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
      scheduler.setPoolSize(1);
      scheduler.setThreadNamePrefix("issue220-search-");
      return scheduler;
    }

    /**
     * Registers production startup and after-commit handling against the real scheduler.
     *
     * @param projection real owner use cases
     * @param tasks sole execution thread
     * @return startup and after-commit listener using the production cadence
     */
    @Bean
    SearchProjectionScheduler scheduler(ProjectSearch projection, ThreadPoolTaskScheduler tasks) {
      return new SearchProjectionScheduler(
          projection,
          tasks,
          new SearchProjectionProperties(Duration.ofHours(1)),
          new SimpleMeterRegistry());
    }
  }
}
