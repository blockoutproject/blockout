package com.blockout.backend.search.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;

import com.blockout.backend.search.application.SearchDocuments;
import com.blockout.backend.search.application.SearchProjection;
import com.blockout.backend.search.application.SearchUnavailableException;
import com.blockout.backend.sporting.application.SportingProjectionChanges;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.service.SportingReadService;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.opensearch.client.opensearch.OpenSearchClient;
import org.opensearch.client.opensearch.core.BulkRequest;
import org.opensearch.client.opensearch.indices.OpenSearchIndicesClient;
import org.opensearch.client.opensearch.indices.RefreshRequest;
import org.opensearch.client.opensearch.indices.UpdateAliasesRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Migrated PostgreSQL, F02 event/read owners and real TLS engine; all indexes are synthetic. */
@SpringBootTest
@Testcontainers
@Import(SearchProjectionIntegrationTest.ProjectionConfiguration.class)
@DisplayName("Native search projection lifecycle")
class SearchProjectionIntegrationTest {
  private static final String PREFIX = "blockout-local-search-issue220";
  private static final UUID CLUB = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private static final UUID TEAM = UUID.fromString("00000000-0000-4000-8000-000000000050");
  private static final UUID POOL = UUID.fromString("00000000-0000-4000-8000-000000000040");
  private static final UUID DIVISION = UUID.fromString("00000000-0000-4000-8000-000000000020");
  @Container static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  @Autowired JdbcTemplate sql;
  @Autowired PlatformTransactionManager transactions;
  @Autowired SportingProjectionChanges changes;
  @Autowired SportingReadService sporting;
  @Autowired SearchProjection projection;
  @Autowired OpenSearchProjectionWriter writer;
  @Autowired ThreadPoolTaskScheduler tasks;

  /**
   * Starts only disposable migrated PostgreSQL and the maintained TLS engine fixture.
   *
   * @param properties current restricted database connection
   * @throws Exception on native setup failure
   */
  @DynamicPropertySource
  static void infrastructure(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
    SearchTestEngine.startEngine();
  }

  /** Stops this suite's TLS engine; Testcontainers owns its PostgreSQL lifecycle. */
  @AfterAll
  static void stopEngine() throws Exception {
    SearchTestEngine.stopEngine();
  }

  /** Resets only this suite's disposable SQL state and publishes a clean empty generation. */
  @BeforeEach
  void fixture() throws Exception {
    drain();
    try (java.sql.Connection connection =
            java.sql.DriverManager.getConnection(
                DATABASE.getJdbcUrl().replace("/postgres", "/blockout"),
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
            SearchTestEngine.client
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
            SearchTestEngine.client
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
    SearchTestEngine.client.indices().delete(request -> request.index(candidate.get(Kind.CLUB)));
    SearchTestEngine.client
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
    SearchProjection failedProjection = new SearchProjection(sporting, failedWriter);

    // When
    Throwable failure =
        org.assertj.core.api.Assertions.catchThrowable(
            () -> tasks.submit(failedProjection::rebuild).get(20, TimeUnit.SECONDS));

    // Then
    assertThat(failure).hasCauseInstanceOf(SearchUnavailableException.class);
    assertThat(aliases().keySet()).containsExactlyInAnyOrderElementsOf(before.keySet());
    assertThat(document("clubs", CLUB).city()).isEqualTo("Lyon");
    assertThat(
            SearchTestEngine.client
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
    OpenSearchIndicesClient indices = spy(SearchTestEngine.client.indices());
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
  @DisplayName("A lost alias acknowledgement is resolved from native aliases before cleanup")
  void resolvesUncertainAliasSuccess() throws Exception {
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
    OpenSearchIndicesClient indices = spy(SearchTestEngine.client.indices());
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
    uncertain.publish(candidate);
    uncertain.cleanup();

    // Then
    assertThat(aliases().keySet()).containsExactlyInAnyOrderElementsOf(candidate.values());
    assertThat(document("clubs", CLUB).names()).containsExactly("Replacement");
  }

  @Test
  @DisplayName("An interrupted alias request preserves the old usable aliases")
  void preservesUncertainOldAliases() throws Exception {
    // Given
    full();
    Map<String, ?> before = aliases();
    Map<Kind, String> candidate = writer.createGeneration();
    OpenSearchIndicesClient indices = spy(SearchTestEngine.client.indices());
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
    SearchTestEngine.createIndex(unrelated);
    SearchTestEngine.createIndex(other);
    for (int generation = 0; generation < 5; generation++) writer.createGeneration();

    // When
    writer.cleanup();

    // Then
    assertThat(
            SearchTestEngine.client
                .indices()
                .getAlias(request -> request.index(PREFIX + "-*-g-*"))
                .result())
        .hasSize(6);
    assertThat(
            SearchTestEngine.client
                .indices()
                .exists(request -> request.index(unrelated, other))
                .value())
        .isTrue();
    assertThat(aliases()).hasSize(3);
    writer.cleanup();
    SearchTestEngine.client.indices().delete(request -> request.index(unrelated, other));
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
   * Reads the current native alias document for the explicit fixture identity.
   *
   * @param resource clubs, teams or pools
   * @param id current fixture identity
   * @return native serialized document
   */
  private SearchDocuments document(String resource, UUID id) throws Exception {
    return SearchTestEngine.client
        .get(
            request -> request.index(PREFIX + "-" + resource).id(id.toString()),
            SearchDocuments.class)
        .source();
  }

  /**
   * @return exact current alias targets in this suite's owned namespace
   */
  private Map<String, ?> aliases() throws Exception {
    return SearchTestEngine.client
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
    /**
     * @return real writer with a spy asserting that every bulk call is outside SQL
     */
    @Bean
    OpenSearchProjectionWriter writer() throws IOException {
      OpenSearchClient client = spy(SearchTestEngine.client);
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
     * @param sporting real current SQL owner
     * @param writer real native generation writer
     * @return actual projection use cases
     */
    @Bean
    SearchProjection projection(SportingReadService sporting, OpenSearchProjectionWriter writer) {
      return new SearchProjection(sporting, writer);
    }

    /**
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
     * @param projection real owner use cases
     * @param tasks sole execution thread
     * @return startup and after-commit listener using the production cadence
     */
    @Bean
    SearchProjectionScheduler scheduler(
        SearchProjection projection, ThreadPoolTaskScheduler tasks) {
      return new SearchProjectionScheduler(
          projection,
          tasks,
          new SearchProjectionProperties(Duration.ofHours(1)),
          new SimpleMeterRegistry());
    }
  }
}
