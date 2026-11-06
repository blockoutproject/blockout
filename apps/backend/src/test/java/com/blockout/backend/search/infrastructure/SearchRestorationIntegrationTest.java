package com.blockout.backend.search.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import com.blockout.backend.search.application.SearchDocuments;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.Statement;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.opensearch.client.opensearch.indices.get_alias.IndexAliases;
import tools.jackson.databind.JsonNode;

/**
 * Opt-in process/restore proof using a packaged serving backend and two disposable PostgreSQL
 * volumes. No Spring test context, mocked projection owner or provider replaces the serving path.
 */
@EnabledIfSystemProperty(named = "qualification.search-restoration", matches = "true")
@DisplayName("Packaged search process continuity and SQL restoration")
class SearchRestorationIntegrationTest {
  private static final UUID CLUB = UUID.fromString("00000000-0000-4000-8000-000000000351");
  private static final UUID RESTRICTED = UUID.fromString("00000000-0000-4000-8000-000000000352");
  private static final UUID TEAM = UUID.fromString("00000000-0000-4000-8000-000000000353");
  private static final UUID POOL = UUID.fromString("00000000-0000-4000-8000-000000000354");
  private static final UUID SEASON = UUID.fromString("00000000-0000-4000-8000-000000000355");
  private static final UUID DIVISION = UUID.fromString("00000000-0000-4000-8000-000000000356");

  @Test
  @DisplayName(
      "Recovers lost serving work and publishes current search from independently restored SQL")
  void restoresCurrentSearchThroughTheServingProcess() throws Exception {
    // Given: the real changelog and synthetic owner state, with one initially restricted witness.
    try (SearchRestorationRuntime runtime = new SearchRestorationRuntime()) {
      runtime.migrate();
      seed(runtime);
      runtime.start(runtime.prefix, "3s");
      awaitPublished(runtime, runtime.prefix);
      assertSearch(runtime, "Originalcity", false);
      Map<String, String> original = aliases(runtime, runtime.prefix);

      // When: a native SQL lock holds a full run after its club/team reads. The HTTP commit
      // queues a targeted update on the same serving scheduler, then the process loses its queue.
      try (Connection held = holdFullRun(runtime)) {
        awaitBlockedFullRun(runtime);
        runtime.changeCity(CLUB, "Recoveredcity");
        assertThat(document(runtime, runtime.prefix, "clubs", CLUB).city())
            .isEqualTo("Originalcity");
        assertThat(runtime.results("/clubs?q=Originalcity", "clubs").isEmpty()).isTrue();
        runtime.crash();
      }

      // Then: the incomplete full run never replaced any usable alias. Startup alone catches up.
      assertThat(aliases(runtime, runtime.prefix)).isEqualTo(original);
      runtime.start(runtime.prefix, "3s");
      await()
          .atMost(Duration.ofSeconds(30))
          .untilAsserted(
              () -> {
                assertThat(aliases(runtime, runtime.prefix)).isNotEqualTo(original);
                assertThat(document(runtime, runtime.prefix, "clubs", CLUB).city())
                    .isEqualTo("Recoveredcity");
              });
      assertSearch(runtime, "Recoveredcity", false);

      // When: an unsubmitted SQL change must be caught by the next ordinary fixed-delay run.
      Map<String, String> restarted = aliases(runtime, runtime.prefix);
      runtime.sql.update(
          "UPDATE sporting_club SET source_name = 'Continuity periodic club' WHERE id = ?", CLUB);
      await()
          .atMost(Duration.ofSeconds(30))
          .untilAsserted(
              () -> {
                assertThat(aliases(runtime, runtime.prefix)).isNotEqualTo(restarted);
                assertThat(document(runtime, runtime.prefix, "clubs", CLUB).names())
                    .contains("Continuity periodic club");
              });

      // When: a held startup rebuild serializes two real commits. Its one-hour next-run delay
      // prevents a later full run from concealing a stale queued update.
      runtime.crash();
      Map<String, String> periodic = aliases(runtime, runtime.prefix);
      try (Connection held = holdFullRun(runtime)) {
        runtime.start(runtime.prefix, "1h");
        awaitBlockedFullRun(runtime);
        runtime.changeCity(CLUB, "Intermediatecity");
        runtime.changeCity(CLUB, "Latestcity");
        assertThat(document(runtime, runtime.prefix, "clubs", CLUB).city())
            .isEqualTo("Recoveredcity");
        assertThat(runtime.results("/clubs?q=Recoveredcity", "clubs").isEmpty()).isTrue();
      }

      // Then: queued work makes current values searchable before another full run is due.
      await()
          .atMost(Duration.ofSeconds(30))
          .untilAsserted(
              () -> {
                assertThat(aliases(runtime, runtime.prefix)).isNotEqualTo(periodic);
                assertThat(document(runtime, runtime.prefix, "clubs", CLUB).city())
                    .isEqualTo("Latestcity");
                assertThat(document(runtime, runtime.prefix, "teams", TEAM).city())
                    .isEqualTo("Latestcity");
                assertSearch(runtime, "Latestcity", false);
              });

      // When: an actual native dump is restored only after stopping this backend and source.
      runtime.crash();
      Path archive = runtime.dump();
      runtime.restore(archive);
      // Current synthetic privacy evidence is newer than the archive. Reconcile before reopening;
      // this is fixture setup, not qualification of F11's separately owned manual invocation.
      runtime.sql.update(
          "UPDATE sporting_club SET municipality = NULL, municipality_manual = NULL, municipality_restricted = TRUE, contacts_revision = contacts_revision + 1 WHERE id = ?",
          CLUB);
      String restoredPrefix = runtime.prefix + "-restored";
      assertThat(aliases(runtime, restoredPrefix)).isEmpty();

      // Then: a first interrupted rebuild with no prior aliases never exposes partial search.
      try (Connection held = holdFullRun(runtime)) {
        runtime.start(restoredPrefix, "3s");
        awaitBlockedFullRun(runtime);
        assertThat(runtime.request("/clubs?q=Continuity").statusCode()).isEqualTo(503);
        assertThat(aliases(runtime, restoredPrefix)).isEmpty();
        runtime.crash();
      }
      runtime.start(restoredPrefix, "1h");
      awaitPublished(runtime, restoredPrefix);
      assertSearch(runtime, "Latestcity", true);
      assertThat(document(runtime, restoredPrefix, "clubs", CLUB).city()).isNull();
      assertThat(document(runtime, restoredPrefix, "teams", TEAM).city()).isNull();
      assertThat(
              runtime.sql.queryForObject("SELECT count(*) FROM databasechangelog", Integer.class))
          .isPositive();
    }
  }

  /**
   * Creates only scenario-owned sporting facts and one local principal with its actual F12 grant.
   *
   * @param runtime explicit disposable source connection and local issuer
   */
  private void seed(SearchRestorationRuntime runtime) {
    runtime.sql.update(
        "INSERT INTO sporting_club(id, provider, reference, source_name, municipality) VALUES (?, 'FFVB', '351-club', 'Continuity club', 'Originalcity')",
        CLUB);
    runtime.sql.update(
        "INSERT INTO sporting_club(id, provider, reference, source_name, municipality_restricted) VALUES (?, 'FFVB', '351-restricted', 'Restricted witness', TRUE)",
        RESTRICTED);
    runtime.sql.update(
        "INSERT INTO sporting_season(id, start_year, label) VALUES (?, 2026, '2026/2027')", SEASON);
    runtime.sql.update(
        "INSERT INTO sporting_division(id, name, active, color) VALUES (?, 'Continuity division', TRUE, '#112233')",
        DIVISION);
    UUID pack = UUID.fromString("00000000-0000-4000-8000-000000000357");
    runtime.sql.update(
        "INSERT INTO sporting_pack(id, season_id, provider, organizer_reference, reference) VALUES (?, ?, 'LNV', 'synthetic', '351-pack')",
        pack,
        SEASON);
    runtime.sql.update(
        "INSERT INTO sporting_pool(id, season_id, pack_id, provider, organizer_reference, competition_reference, reference, source_name, division_id, format, gender) VALUES (?, ?, ?, 'LNV', 'synthetic', 'competition', '351-pool', 'Continuity pool', ?, '_6X6', 'FEMALE')",
        POOL,
        SEASON,
        pack,
        DIVISION);
    runtime.sql.update(
        "INSERT INTO sporting_team(id, season_id, provider, organizer_reference, competition_reference, native_reference, source_name, comparison_name, club_id, division_id, format, gender) VALUES (?, ?, 'LNV', 'synthetic', 'competition', '351-team', 'Continuity team', 'continuity team', ?, ?, '_6X6', 'FEMALE')",
        TEAM,
        SEASON,
        CLUB,
        DIVISION);
    runtime.sql.update(
        "INSERT INTO sporting_participation(id, team_id, pool_id, current) VALUES (?, ?, ?, TRUE)",
        UUID.fromString("00000000-0000-4000-8000-000000000358"),
        TEAM,
        POOL);
    UUID operator = UUID.fromString("00000000-0000-4000-8000-000000000359");
    runtime.sql.update(
        "INSERT INTO account(id, issuer, subject, username, email) VALUES (?, ?, 'search-restoration-operator', 'Search_351', 'search351@example.invalid')",
        operator,
        runtime.issuer());
    runtime.sql.update(
        "INSERT INTO account_permission(account_id, permission) VALUES (?, 'sporting-presentation.manage')",
        operator);
  }

  /**
   * Holds the full run's pool-alias read without preventing current club summaries or edits.
   * Closing the returned transaction releases its native lock, with no application test hook.
   *
   * @param runtime owned database connection
   * @return caller-owned transaction holding the actual PostgreSQL lock
   * @throws Exception if lock acquisition fails
   */
  private Connection holdFullRun(SearchRestorationRuntime runtime) throws Exception {
    Connection connection = runtime.migrationConnection();
    connection.setAutoCommit(false);
    try (Statement statement = connection.createStatement()) {
      statement.execute("SET LOCAL lock_timeout = '5s'");
      statement.execute("LOCK TABLE sporting_pool_alias IN ACCESS EXCLUSIVE MODE");
    } catch (Exception failure) {
      connection.close();
      throw failure;
    }
    return connection;
  }

  /**
   * Observes the serving process waiting on the test's real table lock before committing changes.
   *
   * @param runtime isolated database and named serving connections
   */
  private void awaitBlockedFullRun(SearchRestorationRuntime runtime) {
    await()
        .atMost(Duration.ofSeconds(20))
        .untilAsserted(
            () ->
                assertThat(
                        runtime.sql.queryForObject(
                            "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND application_name = 'search-restoration-serving' AND wait_event_type = 'Lock'",
                            Integer.class))
                    .isPositive());
  }

  /**
   * Requires all three aliases and representative native documents before declaring readiness.
   *
   * @param runtime real engine used by the serving writer
   * @param prefix this source or restored namespace
   */
  private void awaitPublished(SearchRestorationRuntime runtime, String prefix) {
    await()
        .atMost(Duration.ofSeconds(30))
        .untilAsserted(
            () -> {
              assertThat(aliases(runtime, prefix).keySet())
                  .containsExactlyInAnyOrder(
                      prefix + "-clubs", prefix + "-teams", prefix + "-pools");
              assertThat(document(runtime, prefix, "clubs", CLUB)).isNotNull();
              assertThat(document(runtime, prefix, "teams", TEAM)).isNotNull();
              assertThat(document(runtime, prefix, "pools", POOL)).isNotNull();
            });
  }

  /**
   * Reads native alias ownership without treating an existing unaliased candidate as publication.
   *
   * @param runtime task-owned engine
   * @param prefix exact source or restored namespace
   * @return alias-to-generation map for the three public resources
   * @throws Exception on native metadata failure
   */
  private Map<String, String> aliases(SearchRestorationRuntime runtime, String prefix)
      throws Exception {
    Map<String, String> aliases = new LinkedHashMap<>();
    for (Map.Entry<String, IndexAliases> index :
        runtime
            .engine
            .indices()
            .getAlias(
                request ->
                    request.index(prefix + "-*").allowNoIndices(true).ignoreUnavailable(true))
            .result()
            .entrySet()) {
      for (String alias : index.getValue().aliases().keySet()) {
        if (List.of(prefix + "-clubs", prefix + "-teams", prefix + "-pools").contains(alias)) {
          assertThat(aliases.put(alias, index.getKey()))
              .as("One generation per public alias")
              .isNull();
        }
      }
    }
    return aliases;
  }

  /**
   * Reads the actual serialized document behind one public alias.
   *
   * @param runtime task-owned native client
   * @param prefix active source or restored namespace
   * @param resource clubs, teams or pools
   * @param id expected stable sporting identity
   * @return native document, absent if the identity is not published
   * @throws Exception on native read failure
   */
  private SearchDocuments document(
      SearchRestorationRuntime runtime, String prefix, String resource, UUID id) throws Exception {
    return runtime
        .engine
        .get(
            request -> request.index(prefix + "-" + resource).id(id.toString()),
            SearchDocuments.class)
        .source();
  }

  /**
   * Verifies actual filtered HTTP reads, stable identities and absent restricted city values.
   *
   * @param runtime real packaged HTTP backend
   * @param oldCity city to reject after reconciliation, otherwise the current permitted city
   * @param restricted whether the main club's city was restricted after the dump
   * @throws Exception if transport, current hydration or assertions fail
   */
  private void assertSearch(SearchRestorationRuntime runtime, String oldCity, boolean restricted)
      throws Exception {
    JsonNode clubs = runtime.results("/clubs?q=Continuity", "clubs");
    assertThat(clubs.size()).isEqualTo(1);
    assertThat(clubs.get(0).path("club").path("id").asText()).isEqualTo(CLUB.toString());
    String filters =
        "&seasonId=" + SEASON + "&divisionId=" + DIVISION + "&format=6x6&gender=female";
    JsonNode teams = runtime.results("/teams?q=Continuity" + filters, "teams");
    assertThat(teams.size()).isEqualTo(1);
    assertThat(teams.get(0).path("team").path("id").asText()).isEqualTo(TEAM.toString());
    JsonNode pools = runtime.results("/pools?q=Continuity" + filters, "pools");
    assertThat(pools.size()).isEqualTo(1);
    assertThat(pools.get(0).path("pool").path("id").asText()).isEqualTo(POOL.toString());
    assertThat(runtime.results("/teams?q=Continuity&gender=male", "teams").isEmpty()).isTrue();
    assertThat(runtime.results("/pools?q=Continuity&format=4x4", "pools").isEmpty()).isTrue();
    JsonNode witness = runtime.results("/clubs?q=Restricted", "clubs");
    assertThat(witness.size()).isEqualTo(1);
    assertThat(witness.get(0).hasNonNull("city")).isFalse();
    if (restricted) {
      assertThat(clubs.get(0).hasNonNull("city")).isFalse();
      assertThat(runtime.results("/clubs?q=" + oldCity, "clubs").isEmpty()).isTrue();
      assertThat(runtime.results("/teams?q=" + oldCity, "teams").isEmpty()).isTrue();
    } else {
      assertThat(clubs.get(0).path("city").asText()).isEqualTo(oldCity);
      assertThat(runtime.results("/clubs?q=" + oldCity, "clubs").size()).isEqualTo(1);
    }
  }
}
