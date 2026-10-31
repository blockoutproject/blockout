package com.blockout.backend.search.application;

import static com.blockout.backend.sporting.support.SportingIngestionFixture.DIVISION;
import static com.blockout.backend.sporting.support.SportingIngestionFixture.candidate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.collection.application.service.AdmitCollectionCycle;
import com.blockout.backend.collection.application.service.RegisterCollectorRuntime;
import com.blockout.backend.search.infrastructure.OpenSearchEngine;
import com.blockout.backend.search.infrastructure.OpenSearchProjectionWriter;
import com.blockout.backend.search.infrastructure.SearchIndexProperties;
import com.blockout.backend.search.infrastructure.SearchTestEngine;
import com.blockout.backend.sporting.application.SportingProjectionChanges;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.model.SportingPresentation;
import com.blockout.backend.sporting.application.model.SportingVisibility;
import com.blockout.backend.sporting.application.service.AcceptCalendar;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import com.blockout.backend.sporting.application.service.ChangeDivisionLifecycle;
import com.blockout.backend.sporting.application.service.ChangeSportingPresentation;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import com.blockout.backend.sporting.support.SportingIdentityFixture;
import com.blockout.backend.sporting.support.SportingIngestionFixture;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * F13 A02 over admitted F01 cycles, committed F02 corrections, actual F03 HTTP reads and the F04
 * native writer. Source observations, fixed time and persisted operator grants are controlled.
 * Explicit projection calls hold catch-up without replacing SQL, engine or publication owners.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({
  PostgresTestConfiguration.class,
  SportingIdentityFixture.class,
  CurrentSportingTruthIntegrationTest.ProjectionConfiguration.class
})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Current sporting truth before and after native search catch-up")
class CurrentSportingTruthIntegrationTest {
  private static final String PREFIX = "blockout-local-search-issue212";
  private static final UUID OPERATOR = UUID.fromString("00000000-0000-4000-8000-000000000212");
  private static final Instant FIRST = Instant.parse("2026-10-24T12:00:00Z");
  @Autowired private PostgreSQLContainer database;
  @Autowired private JdbcTemplate sql;
  @Autowired private ChangeCollectionSeasons seasons;
  @Autowired private SportingIdentityFixture identities;
  @Autowired private AdmitCollectionCycle cycles;
  @Autowired private RegisterCollectorRuntime runtimes;
  @Autowired private AcceptCalendar calendars;
  @Autowired private ChangeSportingPresentation presentation;
  @Autowired private ChangeDivisionLifecycle divisions;
  @Autowired private ReadSportingData sporting;
  @Autowired private ProjectSearch projection;
  @Autowired private SearchTestEngine engine;
  @Autowired private MockMvc mvc;
  @Autowired private JsonMapper json;
  @MockitoBean private Clock clock;
  private SportingIngestionFixture.Scope scope;

  /** Resets this context's migrated database and admits the actual synthetic source capability. */
  @BeforeEach
  void admit() throws Exception {
    when(clock.instant()).thenReturn(FIRST);
    SportingIngestionFixture.reset(database);
    sql.update("DELETE FROM account");
    scope = SportingIngestionFixture.admit(sql, seasons, identities, cycles, runtimes);
    sql.update(
        "INSERT INTO account(id,issuer,subject,username,email,principal_created_at) VALUES (?, 'https://identity.example.invalid/', 'issue212', 'issue212', 'synthetic@example.invalid', '2020-01-01T00:00:00Z')",
        OPERATOR);
    for (String grant : List.of("sporting-presentation.manage", "division-lifecycle.manage")) {
      sql.update(
          "INSERT INTO account_permission(account_id,permission) VALUES (?,?)", OPERATOR, grant);
    }
  }

  @Test
  @DisplayName("Corrections govern rereads and restrictions reject stale candidates and old work")
  void preservesCurrentTruthAcrossDelayedProjection() throws Exception {
    // Given: an earlier read is held while a later initial calendar commits and is indexed.
    CalendarObservation older = calendar(1, LocalDate.of(2026, 10, 23));
    ObservationOutcome.Calendar initial =
        calendars.accept(scope.pool(), calendar(2, LocalDate.of(2026, 10, 24)));
    UUID match = initial.outcomes().getFirst().resourceId();
    Set<SportingProjectionChanges.Scope> delayed =
        Set.of(
            new SportingProjectionChanges.Scope(SportingProjectionChanges.Kind.POOL, scope.pool()));
    projection.rebuild();
    String originalGeneration = generation();
    assertThat(document().names()).contains("Synthetic pool");
    assertThat(read("/pools?q=synthetic").get("pools").size()).isEqualTo(1);
    read("/matches/" + match);
    read(calendarPath());

    // When: F02 accepts a schedule correction and an operator changes the pool presentation.
    ObservationOutcome.Calendar corrected =
        calendars.accept(scope.pool(), calendar(3, LocalDate.of(2026, 11, 2)));
    SportingPresentation.View viewed =
        sporting.publicPresentation(SportingVisibility.Kind.POOL, scope.pool()).orElseThrow();
    presentation.set(
        OPERATOR,
        SportingProjectionChanges.Kind.POOL,
        scope.pool(),
        new SportingPresentation.Edit(viewed.revision(), "Corrected pool", null, null, null));

    // Then: opening and explicitly rereading F03 uses accepted truth while the index is still old.
    assertThat(corrected.acceptedCount()).isEqualTo(1);
    for (int read = 0; read < 2; read++) {
      JsonNode detail = read("/matches/" + match);
      assertThat(detail.at("/match/schedule/localDate").asString()).isEqualTo("2026-11-02");
      assertThat(detail.at("/match/pool/pool/name").asString()).isEqualTo("Corrected pool");
      JsonNode calendar = read(calendarPath());
      assertThat(calendar.get("days").size()).isEqualTo(1);
      assertThat(calendar.at("/days/0/date").asString()).isEqualTo("2026-11-02");
    }
    assertThat(document().names()).contains("Synthetic pool").doesNotContain("Corrected pool");
    assertThat(read("/pools?q=synthetic").at("/pools/0/pool/name").asString())
        .isEqualTo("Corrected pool");

    // When: old queued scope work runs through the real targeted update, rereading current SQL.
    projection.update(delayed);

    // Then: update preserves the generation and publishes the corrected owner presentation.
    assertThat(generation()).isEqualTo(originalGeneration);
    assertThat(document().names()).contains("Corrected pool", "Synthetic pool");

    // When: a current owner restriction precedes catch-up and the held observation is delivered.
    divisions.setActive(
        OPERATOR,
        DIVISION,
        sql.queryForObject(
            "SELECT revision::TEXT FROM sporting_division WHERE id=?", String.class, DIVISION),
        false);
    ObservationOutcome.Calendar stale = calendars.accept(scope.pool(), older);

    // Then: stale work restores neither accepted facts nor direct/index-derived visibility.
    assertThat(stale.acceptedCount()).isZero();
    assertThat(stale.staleCount()).isEqualTo(1);
    assertThat(stale.rejectedCount()).isZero();
    assertThat(stale.absenceReconciled()).isFalse();
    assertThat(
            sql.queryForObject(
                "SELECT local_date FROM sporting_match WHERE id=?", LocalDate.class, match))
        .isEqualTo(LocalDate.of(2026, 11, 2));
    assertThat(document().names()).contains("Corrected pool");
    mvc.perform(get("/matches/" + match)).andExpect(status().isNotFound());
    mvc.perform(get("/pools/" + scope.pool())).andExpect(status().isNotFound());
    mvc.perform(get(calendarPath())).andExpect(status().isNotFound());
    assertThat(read("/pools?q=corrected").get("pools").isEmpty()).isTrue();

    // When: both ordinary targeted catch-up and complete replacement finish after the restriction.
    projection.update(delayed);
    assertThat(
            engine
                .client
                .exists(request -> request.index(PREFIX + "-pools").id(scope.pool().toString()))
                .value())
        .isFalse();
    projection.rebuild();

    // Then: replacement is a separately observed current publication, never a resurrection.
    assertThat(generation()).isNotEqualTo(originalGeneration);
    assertThat(
            engine
                .client
                .exists(request -> request.index(PREFIX + "-pools").id(scope.pool().toString()))
                .value())
        .isFalse();
    assertThat(read("/pools?q=corrected").get("pools").isEmpty()).isTrue();
  }

  /**
   * Supplies ordered observations to the already admitted F01 capability, preserving identity.
   *
   * @param ordinal explicit pre-read order within the admitted cycle
   * @param date proposed source-local date
   * @return one complete synthetic calendar without inferred publication time
   */
  private CalendarObservation calendar(long ordinal, LocalDate date) {
    return new CalendarObservation(
        new MatchObservation.Context(scope.cycle().id(), ordinal, FIRST.plusSeconds(ordinal), null),
        true,
        List.of(candidate("M1", "Home", date)),
        List.of(),
        List.of());
  }

  /** Selects the current synthetic pool's upcoming calendar through the production HTTP surface. */
  private String calendarPath() {
    return "/matches?poolId=" + scope.pool() + "&category=upcoming&timeZone=Europe/Paris";
  }

  /**
   * Performs a fresh public F03/F04 read without constructing a response or bypassing security.
   *
   * @param path canonical public path and scenario query parameters
   * @return actual successfully served JSON
   * @throws Exception if the public request or decoding fails
   */
  private JsonNode read(String path) throws Exception {
    return json.readTree(
        mvc.perform(get(path))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString());
  }

  /** Reads the native alias target so update and replacement are observed independently. */
  private String generation() throws Exception {
    return engine
        .client
        .indices()
        .getAlias(request -> request.index(PREFIX + "-*").name(PREFIX + "-pools"))
        .result()
        .keySet()
        .iterator()
        .next();
  }

  /** Reads the real active index document; current SQL hydration is asserted separately. */
  private SearchDocuments document() throws Exception {
    return engine
        .client
        .get(
            request -> request.index(PREFIX + "-pools").id(scope.pool().toString()),
            SearchDocuments.class)
        .source();
  }

  /** Reuses the existing native TLS fixture and production adapters with explicit publication. */
  @TestConfiguration(proxyBeanMethods = false)
  static class ProjectionConfiguration {
    /** Starts and closes one task-owned engine with this Spring context. */
    @Bean(initMethod = "startEngine", destroyMethod = "close")
    SearchTestEngine truthEngine() {
      return new SearchTestEngine();
    }

    /**
     * Supplies real candidate matching in the same isolated namespace as the native writer.
     *
     * @param engine context-owned native TLS engine
     * @return production matching adapter
     */
    @Bean
    @Primary
    SearchEngine truthSearch(SearchTestEngine engine) {
      return new OpenSearchEngine(engine.client, new SearchIndexProperties(PREFIX));
    }

    /**
     * Constructs the production writer without a second scheduler or simulated engine results.
     *
     * @param engine context-owned native TLS engine
     * @return production targeted and generation writer
     */
    @Bean
    SearchProjectionWriter truthWriter(SearchTestEngine engine) {
      return new OpenSearchProjectionWriter(engine.client, new SearchIndexProperties(PREFIX));
    }

    /**
     * Keeps current-state orchestration under its actual Spring transaction guard.
     *
     * @param sporting actual current sporting owner reads
     * @param writer native scoped projection writer
     * @return Spring-proxied production orchestration
     */
    @Bean
    ProjectSearch truthProjection(ReadSportingData sporting, SearchProjectionWriter writer) {
      return new ProjectSearch(sporting, writer);
    }
  }
}
