package com.blockout.backend.collection.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.groups.Tuple.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.Appender;
import com.blockout.backend.collection.application.model.CollectionResult;
import com.blockout.backend.collection.application.model.RecordCollectionResult;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.collection.application.service.CollectionOperationalDiagnostics;
import com.blockout.backend.collection.application.service.ObserveCollectionSource;
import com.blockout.backend.collection.application.service.ReadCollectionWork;
import com.blockout.backend.collection.application.service.RecordCollectionResults;
import com.blockout.backend.collection.application.service.RegisterCollectorRuntime;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.net.URI;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Real committed F01 projections and native ECS events on disposable SQL. */
@SpringBootTest
@ExtendWith(OutputCaptureExtension.class)
@DisplayName("Committed collection operational evidence")
@Import(PostgresTestConfiguration.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class CollectionOperationalEvidenceIntegrationTest {
  private static final Instant FIRST = Instant.parse("2026-10-25T00:00:00Z");
  private static final UUID CLUBS = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private static final UUID GEO = UUID.fromString("00000000-0000-4000-8000-000000000002");
  private static final UUID COMPETITIONS = UUID.fromString("00000000-0000-4000-8000-000000000202");
  private static final UUID SCOPE = UUID.fromString("00000000-0000-4000-8000-000000000203");
  private static final UUID OTHER = UUID.fromString("00000000-0000-4000-8000-000000000204");
  private static final URI TECHNICAL = URI.create("urn:blockout:acquisition:technical");
  @Autowired private RecordCollectionResults results;
  @Autowired private RegisterCollectorRuntime runtimes;
  @Autowired private ReadCollectionWork collectionWork;
  @Autowired private ObserveCollectionSource sources;
  @Autowired private CollectionStore store;
  @Autowired private ChangeCollectionSeasons seasons;
  @Autowired private PlatformTransactionManager transactions;
  @Autowired private JdbcTemplate sql;
  private UUID season;
  private UUID incarnation;

  /**
   * Installs only this suite's synthetic state; no provider, admission or F02 ingestion is faked.
   */
  @BeforeEach
  void isolatedState() {
    sql.update("DELETE FROM collection_result");
    sql.update("DELETE FROM collection_cycle");
    sql.update("DELETE FROM collection_source_binding");
    sql.update("UPDATE collection_control SET current_cycle_id = NULL, enabled = TRUE");
    season = seasons.getOrCreate(2026).id();
    sql.update("UPDATE sporting_season SET collection_state = 'ACTIVE' WHERE id = ?", season);
    sql.update(
        "INSERT INTO collection_control(id,season_id,family,enabled) VALUES (?,?,'FFVB',TRUE) ON CONFLICT (id) DO NOTHING",
        COMPETITIONS,
        season);
    incarnation = UUID.randomUUID();
    runtimes.register(collectionWork.current().revision(), incarnation);
  }

  @ParameterizedTest
  @EnumSource(
      value = CollectionModeEnum.class,
      names = {"PERIODIC", "MANUAL"})
  @DisplayName("First competition failure is actionable for periodic and manual evidence")
  void firstCompetitionFailure(CollectionModeEnum mode, CapturedOutput output) {
    // Given
    UUID cycle = running(COMPETITIONS, SCOPE, CollectionStageEnum.CALENDAR);
    sql.update("UPDATE collection_cycle SET mode = ? WHERE id = ?", mode.name(), cycle);

    // When
    results.record(
        cycle,
        attempt(
            SCOPE,
            CollectionStageEnum.CALENDAR,
            CollectionPhaseEnum.ACQUISITION,
            1,
            FIRST,
            CollectionOutcomeEnum.FAILED,
            TECHNICAL));

    // Then
    JsonNode log = evidence(output).getLast();
    assertThat(log.path("collection_actionable").asInt()).isEqualTo(1);
    assertThat(log.path("collection_control").asText()).isEqualTo(COMPETITIONS.toString());
    assertThat(log.path("stage").asText()).isEqualTo("calendar");
    assertThat(log.path("phase").asText()).isEqualTo("acquisition");
    assertThat(log.path("last_success_at").isNull()).isTrue();
    assertThat(log.path("affected_count").isNull()).isTrue();
  }

  @ParameterizedTest
  @EnumSource(
      value = CollectionStageEnum.class,
      names = {"CLUB_SHEET", "GEOCODING"})
  @DisplayName("Seasonless technical failures are actionable immediately across cycles")
  void reportsSeasonlessFailureImmediately(CollectionStageEnum stage, CapturedOutput output) {
    // Given
    UUID control = stage == CollectionStageEnum.CLUB_SHEET ? CLUBS : GEO;
    UUID cycle = running(control, SCOPE, stage);
    results.record(
        cycle,
        attempt(
            SCOPE,
            stage,
            CollectionPhaseEnum.ACQUISITION,
            1,
            FIRST,
            CollectionOutcomeEnum.FAILED,
            TECHNICAL));
    results.complete(cycle, FIRST.plusSeconds(1));
    UUID next = running(control, SCOPE, stage);

    // When
    results.record(
        next,
        attempt(
            SCOPE,
            stage,
            CollectionPhaseEnum.ACQUISITION,
            1,
            FIRST.plusSeconds(60),
            CollectionOutcomeEnum.FAILED,
            TECHNICAL));

    // Then
    CollectionResult current = current(control, SCOPE, stage, CollectionPhaseEnum.ACQUISITION);
    assertThat(current.outcome()).isEqualTo(CollectionOutcomeEnum.FAILED);
    assertThat(evidence(output))
        .allSatisfy(log -> assertThat(log.path("collection_actionable").asInt()).isEqualTo(1));
    assertThat(current.observedAt()).isEqualTo(FIRST.plusSeconds(60));
  }

  @ParameterizedTest
  @EnumSource(
      value = CollectionStageEnum.class,
      names = {"CLUB_SHEET", "GEOCODING"})
  @DisplayName("Structural seasonless failure is immediately actionable")
  void reportsStructureImmediately(CollectionStageEnum stage, CapturedOutput output) {
    // Given
    UUID control = stage == CollectionStageEnum.CLUB_SHEET ? CLUBS : GEO;
    UUID cycle = running(control, SCOPE, stage);

    // When
    results.record(
        cycle,
        attempt(
            SCOPE,
            stage,
            CollectionPhaseEnum.ACQUISITION,
            1,
            FIRST,
            CollectionOutcomeEnum.FAILED,
            URI.create("urn:blockout:acquisition:structure")));

    // Then
    assertThat(evidence(output).getLast().path("collection_actionable").asInt()).isEqualTo(1);
    assertThat(evidence(output).getLast().path("reason").asText())
        .isEqualTo("structure-or-context");
  }

  @Test
  @DisplayName("Recovery stays within its exact scope and phase")
  void recoversOnlyExactKey(CapturedOutput output) {
    // Given
    UUID cycle = running(COMPETITIONS, SCOPE, CollectionStageEnum.CALENDAR);
    target(cycle, SCOPE, CollectionStageEnum.STANDINGS);
    target(cycle, OTHER, CollectionStageEnum.CALENDAR);
    results.record(
        cycle,
        attempt(
            SCOPE,
            CollectionStageEnum.CALENDAR,
            CollectionPhaseEnum.ACQUISITION,
            1,
            FIRST,
            CollectionOutcomeEnum.FAILED,
            TECHNICAL));
    results.record(
        cycle,
        attempt(
            SCOPE,
            CollectionStageEnum.CALENDAR,
            CollectionPhaseEnum.INTEGRATION,
            1,
            FIRST,
            CollectionOutcomeEnum.UNCONFIRMED,
            TECHNICAL));
    results.record(
        cycle,
        attempt(
            SCOPE,
            CollectionStageEnum.STANDINGS,
            CollectionPhaseEnum.INTEGRATION,
            1,
            FIRST,
            CollectionOutcomeEnum.FAILED,
            TECHNICAL));
    results.record(
        cycle,
        attempt(
            OTHER,
            CollectionStageEnum.CALENDAR,
            CollectionPhaseEnum.ACQUISITION,
            1,
            FIRST,
            CollectionOutcomeEnum.PARTIAL,
            TECHNICAL));

    // When
    results.record(
        cycle,
        attempt(
            SCOPE,
            CollectionStageEnum.CALENDAR,
            CollectionPhaseEnum.ACQUISITION,
            2,
            FIRST.plusSeconds(10),
            CollectionOutcomeEnum.SUCCESS,
            null));

    // Then
    assertThat(
            current(
                    COMPETITIONS,
                    SCOPE,
                    CollectionStageEnum.CALENDAR,
                    CollectionPhaseEnum.ACQUISITION)
                .outcome())
        .isEqualTo(CollectionOutcomeEnum.SUCCESS);
    assertThat(
            current(
                    COMPETITIONS,
                    SCOPE,
                    CollectionStageEnum.CALENDAR,
                    CollectionPhaseEnum.INTEGRATION)
                .outcome())
        .isEqualTo(CollectionOutcomeEnum.UNCONFIRMED);
    assertThat(
            current(
                    COMPETITIONS,
                    SCOPE,
                    CollectionStageEnum.STANDINGS,
                    CollectionPhaseEnum.INTEGRATION)
                .outcome())
        .isEqualTo(CollectionOutcomeEnum.FAILED);
    assertThat(
            current(
                    COMPETITIONS,
                    OTHER,
                    CollectionStageEnum.CALENDAR,
                    CollectionPhaseEnum.ACQUISITION)
                .outcome())
        .isEqualTo(CollectionOutcomeEnum.PARTIAL);
    assertThat(
            evidence(output).stream()
                .filter(log -> !log.path("outcome").asText().equals("success")))
        .allSatisfy(log -> assertThat(log.path("collection_actionable").asInt()).isEqualTo(1));
    JsonNode recovery = evidence(output).getLast();
    assertThat(recovery.path("scope").asText()).isEqualTo(SCOPE.toString());
    assertThat(recovery.path("phase").asText()).isEqualTo("acquisition");
    assertThat(recovery.path("collection_actionable").asInt()).isZero();
  }

  @Test
  @DisplayName("Partial evidence preserves useful success while bounding only diagnostic counts")
  void preservesPartialEvidence(CapturedOutput output) {
    // Given
    UUID cycle = running(COMPETITIONS, SCOPE, CollectionStageEnum.CALENDAR);
    results.record(
        cycle,
        attempt(
            SCOPE,
            CollectionStageEnum.CALENDAR,
            CollectionPhaseEnum.ACQUISITION,
            1,
            FIRST,
            CollectionOutcomeEnum.SUCCESS,
            null));
    RecordCollectionResult partial =
        new RecordCollectionResult(
            SCOPE,
            CollectionStageEnum.CALENDAR,
            CollectionPhaseEnum.ACQUISITION,
            2,
            FIRST.plusSeconds(1),
            CollectionOutcomeEnum.PARTIAL,
            TECHNICAL,
            "synthetic-private-body contact@example.invalid token=secret",
            20_001L,
            2L);

    // When
    results.record(cycle, partial);

    // Then
    CollectionResult result =
        current(COMPETITIONS, SCOPE, CollectionStageEnum.CALENDAR, CollectionPhaseEnum.ACQUISITION);
    assertThat(result.lastSuccessAt()).isEqualTo(FIRST);
    assertThat(result.outcome()).isEqualTo(CollectionOutcomeEnum.PARTIAL);
    assertThat(result.obtainedCount()).isEqualTo(20_001L);
    assertThat(evidence(output).getLast().path("affected_count").asLong()).isEqualTo(10_000);
    assertThat(evidence(output).getLast().path("partial_count").asLong()).isEqualTo(2);
    assertThat(output.getAll())
        .doesNotContain("synthetic-private-body", "contact@example.invalid", "token=secret");
  }

  @Test
  @DisplayName("Pause, closure and completion do not fabricate recovery")
  void retainsFailureWhileClosed(CapturedOutput output) {
    // Given
    UUID cycle = running(COMPETITIONS, SCOPE, CollectionStageEnum.CALENDAR);
    results.record(
        cycle,
        attempt(
            SCOPE,
            CollectionStageEnum.CALENDAR,
            CollectionPhaseEnum.ACQUISITION,
            1,
            FIRST,
            CollectionOutcomeEnum.FAILED,
            TECHNICAL));
    sql.update("UPDATE collection_control SET enabled = FALSE WHERE id = ?", COMPETITIONS);
    new TransactionTemplate(transactions)
        .executeWithoutResult(
            status -> {
              seasons.lockCollectionState(season);
              seasons.closeCollectionSeason(season);
            });
    int recorded = evidence(output).size();

    // When
    results.complete(cycle, FIRST.plusSeconds(1));

    // Then
    assertThat(evidence(output)).hasSize(recorded);
    assertThat(
            current(
                    COMPETITIONS,
                    SCOPE,
                    CollectionStageEnum.CALENDAR,
                    CollectionPhaseEnum.ACQUISITION)
                .outcome())
        .isEqualTo(CollectionOutcomeEnum.FAILED);
    assertThat(
            current(
                    COMPETITIONS,
                    SCOPE,
                    CollectionStageEnum.CALENDAR,
                    CollectionPhaseEnum.ACQUISITION)
                .lastSuccessAt())
        .isNull();
  }

  @Test
  @DisplayName("Rollback publishes no accepted result or recovery log")
  void omitsRolledBackEvidence(CapturedOutput output) {
    // Given
    UUID cycle = running(COMPETITIONS, SCOPE, CollectionStageEnum.CALENDAR);

    // When
    new TransactionTemplate(transactions)
        .executeWithoutResult(
            status -> {
              results.record(
                  cycle,
                  attempt(
                      SCOPE,
                      CollectionStageEnum.CALENDAR,
                      CollectionPhaseEnum.ACQUISITION,
                      1,
                      FIRST,
                      CollectionOutcomeEnum.FAILED,
                      TECHNICAL));
              status.setRollbackOnly();
            });

    // Then
    assertThat(evidence(output)).isEmpty();
    assertThat(
            store.result(
                COMPETITIONS, SCOPE, CollectionStageEnum.CALENDAR, CollectionPhaseEnum.ACQUISITION))
        .isEmpty();
  }

  @Test
  @DisplayName("Committed logs retain each observation while the projection advances")
  void retainsCommittedObservations(CapturedOutput output) {
    // Given
    UUID cycle = running(COMPETITIONS, SCOPE, CollectionStageEnum.CALENDAR);

    // When
    new TransactionTemplate(transactions)
        .executeWithoutResult(
            status -> {
              results.record(
                  cycle,
                  attempt(
                      SCOPE,
                      CollectionStageEnum.CALENDAR,
                      CollectionPhaseEnum.ACQUISITION,
                      1,
                      FIRST,
                      CollectionOutcomeEnum.FAILED,
                      TECHNICAL));
              results.record(
                  cycle,
                  attempt(
                      SCOPE,
                      CollectionStageEnum.CALENDAR,
                      CollectionPhaseEnum.ACQUISITION,
                      2,
                      FIRST.plusSeconds(1),
                      CollectionOutcomeEnum.SUCCESS,
                      null));
              assertThat(evidence(output)).isEmpty();
            });

    // Then
    assertThat(evidence(output))
        .extracting(
            log -> log.path("collection_control").asText(),
            log -> log.path("scope").asText(),
            log -> log.path("stage").asText(),
            log -> log.path("phase").asText(),
            log -> log.path("outcome").asText(),
            log -> log.path("collection_observed_at").asText(),
            log -> log.path("collection_read_ordinal").asLong())
        .containsExactlyInAnyOrder(
            tuple(
                COMPETITIONS.toString(),
                SCOPE.toString(),
                "calendar",
                "acquisition",
                "failed",
                FIRST.toString(),
                1L),
            tuple(
                COMPETITIONS.toString(),
                SCOPE.toString(),
                "calendar",
                "acquisition",
                "success",
                FIRST.plusSeconds(1).toString(),
                2L));
    CollectionResult current =
        current(COMPETITIONS, SCOPE, CollectionStageEnum.CALENDAR, CollectionPhaseEnum.ACQUISITION);
    assertThat(current.outcome()).isEqualTo(CollectionOutcomeEnum.SUCCESS);
    assertThat(current.observedAt()).isEqualTo(FIRST.plusSeconds(1));
  }

  @Test
  @DisplayName("New source reports retain observed provider-season facts without repeat reports")
  void reportsGroupedPreparation(CapturedOutput output) {
    // Given
    ObserveCollectionSource.Proposal first = proposal("SYNTHETIC-A", FIRST);
    ObserveCollectionSource.Proposal second = proposal("SYNTHETIC-B", FIRST.plusSeconds(60));
    sources.observe(first);

    // When
    sources.observe(second);
    sources.observe(first);

    // Then
    List<JsonNode> reports = logs(output, "collection_operator_report");
    assertThat(reports)
        .extracting(log -> log.path("affected_count").asLong())
        .containsExactly(1L, 1L);
    assertThat(reports)
        .extracting(log -> log.path("collection_observed_at").asText())
        .containsExactly(FIRST.toString(), FIRST.plusSeconds(60).toString());
    assertThat(reports)
        .allSatisfy(
            log -> {
              assertThat(log.path("collection_subject").asText()).isEqualTo("season-preparation");
              assertThat(log.path("collection_season").asText()).isEqualTo(season.toString());
              assertThat(log.path("collection_destination").asText()).isEqualTo("/administration");
            });
    assertThat(output.getAll()).doesNotContain("SYNTHETIC-A", "SYNTHETIC-B", "example.invalid");
  }

  @Test
  @DisplayName("Accepted catalog reports retain measured counts and their observation time")
  void reportsAcceptedCatalogFacts(CapturedOutput output) {
    // Given
    UUID cycle = running(COMPETITIONS, SCOPE, CollectionStageEnum.DISCOVERY);
    RecordCollectionResult partial =
        new RecordCollectionResult(
            SCOPE,
            CollectionStageEnum.DISCOVERY,
            CollectionPhaseEnum.INTEGRATION,
            1,
            FIRST,
            CollectionOutcomeEnum.PARTIAL,
            TECHNICAL,
            null,
            3L,
            2L);

    // When
    results.record(cycle, partial);

    // Then
    List<JsonNode> reports = logs(output, "collection_operator_report");
    assertThat(reports).hasSize(1);
    JsonNode report = reports.getFirst();
    assertThat(report.path("collection_subject").asText()).isEqualTo("classification");
    assertThat(report.path("collection_season").asText()).isEqualTo(season.toString());
    assertThat(report.path("provider").asText()).isEqualTo("ffvb");
    assertThat(report.path("collection_observed_at").asText()).isEqualTo(FIRST.toString());
    assertThat(report.path("affected_count").asLong()).isEqualTo(3);
    assertThat(report.path("partial_count").asLong()).isEqualTo(2);
  }

  @Test
  @DisplayName("Current evidence pages use stable scope, stage and phase ordering")
  void ordersCurrentEvidenceByStableKey() {
    // Given
    UUID cycle = running(COMPETITIONS, SCOPE, CollectionStageEnum.CALENDAR);
    target(cycle, SCOPE, CollectionStageEnum.STANDINGS);
    target(cycle, OTHER, CollectionStageEnum.CALENDAR);
    results.record(
        cycle,
        attempt(
            OTHER,
            CollectionStageEnum.CALENDAR,
            CollectionPhaseEnum.INTEGRATION,
            1,
            FIRST,
            CollectionOutcomeEnum.FAILED,
            TECHNICAL));
    results.record(
        cycle,
        attempt(
            SCOPE,
            CollectionStageEnum.STANDINGS,
            CollectionPhaseEnum.ACQUISITION,
            1,
            FIRST,
            CollectionOutcomeEnum.FAILED,
            TECHNICAL));
    results.record(
        cycle,
        attempt(
            SCOPE,
            CollectionStageEnum.CALENDAR,
            CollectionPhaseEnum.INTEGRATION,
            1,
            FIRST,
            CollectionOutcomeEnum.FAILED,
            TECHNICAL));
    results.record(
        cycle,
        attempt(
            SCOPE,
            CollectionStageEnum.CALENDAR,
            CollectionPhaseEnum.ACQUISITION,
            1,
            FIRST,
            CollectionOutcomeEnum.SUCCESS,
            null));

    // When
    List<CollectionResult> page =
        new TransactionTemplate(transactions)
            .execute(status -> store.results(COMPETITIONS, 0, 10).items());
    List<CollectionResult> unrelated =
        new TransactionTemplate(transactions)
            .execute(status -> store.results(CLUBS, 0, 10).items());

    // Then
    assertThat(page)
        .extracting(CollectionResult::scopeId, CollectionResult::stage, CollectionResult::phase)
        .containsExactly(
            org.assertj.core.groups.Tuple.tuple(
                SCOPE, CollectionStageEnum.CALENDAR, CollectionPhaseEnum.ACQUISITION),
            org.assertj.core.groups.Tuple.tuple(
                SCOPE, CollectionStageEnum.CALENDAR, CollectionPhaseEnum.INTEGRATION),
            org.assertj.core.groups.Tuple.tuple(
                SCOPE, CollectionStageEnum.STANDINGS, CollectionPhaseEnum.ACQUISITION),
            org.assertj.core.groups.Tuple.tuple(
                OTHER, CollectionStageEnum.CALENDAR, CollectionPhaseEnum.INTEGRATION));
    assertThat(unrelated).isEmpty();
  }

  @Test
  @DisplayName("Logging failure leaves committed results intact without exposing its payload")
  void retainsCommittedResultWhenLoggingFails(CapturedOutput output) {
    // Given
    UUID cycle = running(COMPETITIONS, SCOPE, CollectionStageEnum.CALENDAR);
    Logger logger = (Logger) LoggerFactory.getLogger(CollectionOperationalDiagnostics.class);
    @SuppressWarnings("unchecked")
    Appender<ILoggingEvent> unavailable = mock(Appender.class);
    doAnswer(
            invocation -> {
              ILoggingEvent event = invocation.getArgument(0);
              if (event.getLevel() == ch.qos.logback.classic.Level.WARN) {
                throw new IllegalStateException(
                    "contact@example.invalid token=secret private-body");
              }
              return null;
            })
        .when(unavailable)
        .doAppend(any(ILoggingEvent.class));
    logger.addAppender(unavailable);

    try {
      // When
      results.record(
          cycle,
          attempt(
              SCOPE,
              CollectionStageEnum.CALENDAR,
              CollectionPhaseEnum.ACQUISITION,
              1,
              FIRST,
              CollectionOutcomeEnum.FAILED,
              TECHNICAL));

      // Then
      CollectionResult committed =
          current(
              COMPETITIONS, SCOPE, CollectionStageEnum.CALENDAR, CollectionPhaseEnum.ACQUISITION);
      assertThat(committed.outcome()).isEqualTo(CollectionOutcomeEnum.FAILED);
      assertThat(committed.observedAt()).isEqualTo(FIRST);
      JsonNode log = logs(output, "collection_diagnostics").getLast();
      assertThat(log.path("outcome").asText()).isEqualTo("unavailable");
      assertThat(log.path("error").path("type").asText())
          .isEqualTo(IllegalStateException.class.getName());
      assertThat(log.has("message")).isFalse();
      assertThat(log.path("error").has("stack_trace")).isFalse();
      assertThat(output.getAll())
          .doesNotContain("contact@example.invalid", "token=secret", "private-body");
    } finally {
      logger.detachAppender(unavailable);
    }
  }

  /**
   * Installs a synthetic already-admitted context to isolate result/diagnostic behavior. Admission
   * qualification remains in its existing dedicated suites, which this fixture does not replace.
   *
   * @param control exact current control
   * @param scope selected stable identity
   * @param stage selected role
   * @return current synthetic passage identity
   */
  private UUID running(UUID control, UUID scope, CollectionStageEnum stage) {
    UUID cycle = UUID.randomUUID();
    sql.update(
        "INSERT INTO collection_cycle(cycle_order,id,incarnation_id,control_id,mode,started_at) VALUES (nextval('collection_cycle_order'),?,?,?,'PERIODIC',?)",
        cycle,
        incarnation,
        control,
        Timestamp.from(FIRST));
    sql.update("UPDATE collection_control SET current_cycle_id = ? WHERE id = ?", cycle, control);
    target(cycle, scope, stage);
    return cycle;
  }

  /**
   * Adds only the explicit role used by a scenario to the synthetic admitted snapshot.
   *
   * @param cycle current synthetic passage
   * @param scope actual selected identity
   * @param stage selected role, excluding separately resolved child logos
   */
  private void target(UUID cycle, UUID scope, CollectionStageEnum stage) {
    sql.update(
        "INSERT INTO collection_target(cycle_id,scope_id,kind) VALUES (?,?,?)",
        cycle,
        scope,
        stage.name());
  }

  /**
   * Reads one persisted key without broadening the result to an unrelated phase or scope.
   *
   * @param control independent family
   * @param scope stable selected identity
   * @param stage exact role
   * @param phase exact phase
   * @return retained current evidence
   */
  private CollectionResult current(
      UUID control, UUID scope, CollectionStageEnum stage, CollectionPhaseEnum phase) {
    return store.result(control, scope, stage, phase).orElseThrow();
  }

  /**
   * Supplies attributable synthetic evidence with deliberately unmeasured counts.
   *
   * @param scope stable selected identity
   * @param stage exact role
   * @param phase independent phase
   * @param ordinal logical order allocated before acquisition
   * @param observedAt real scenario time
   * @param outcome measured outcome
   * @param reasonType fixed reason category, absent on success
   * @return immutable command with no provider body or personal value
   */
  private RecordCollectionResult attempt(
      UUID scope,
      CollectionStageEnum stage,
      CollectionPhaseEnum phase,
      long ordinal,
      Instant observedAt,
      CollectionOutcomeEnum outcome,
      URI reasonType) {
    return new RecordCollectionResult(
        scope, stage, phase, ordinal, observedAt, outcome, reasonType, null, null, null);
  }

  /**
   * Supplies a synthetic accepted source proposal without a live provider read.
   *
   * @param organizer explicit distinct source root
   * @param observedAt actual source observation time
   * @return credential-free evidence in the existing 2026 canonical season
   */
  private ObserveCollectionSource.Proposal proposal(String organizer, Instant observedAt) {
    return new ObserveCollectionSource.Proposal(
        incarnation,
        2026,
        CollectionProviderEnum.FFVB,
        organizer,
        URI.create("https://example.invalid/source"),
        URI.create("https://example.invalid/entry"),
        observedAt);
  }

  /**
   * Selects only evidence events from actual native ECS console output.
   *
   * @param output this scenario's captured output
   * @return parsed committed observations in emitted order
   */
  private List<JsonNode> evidence(CapturedOutput output) {
    return logs(output, "collection_evidence");
  }

  /**
   * Reads native JSON fields rather than relying on log message wording or encoder internals.
   *
   * @param output this scenario's captured output
   * @param operation fixed owned operation
   * @return matching decoded native events
   */
  private List<JsonNode> logs(CapturedOutput output, String operation) {
    JsonMapper json = JsonMapper.builder().build();
    return output
        .getOut()
        .lines()
        .filter(line -> line.startsWith("{"))
        .map(json::readTree)
        .filter(log -> log.path("operation").asText().equals(operation))
        .toList();
  }
}
