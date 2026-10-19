package com.blockout.backend.collection.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionResult;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.model.RecordCollectionResult;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.collection.application.service.CollectionCycleService;
import com.blockout.backend.collection.application.service.CollectionResultService;
import com.blockout.backend.collection.application.service.CollectorRuntimeService;
import com.blockout.backend.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.TeamCandidate;
import com.blockout.backend.sporting.application.service.SeasonService;
import com.blockout.backend.sporting.application.service.SportingIdentityService;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Exercises retained evidence and completion against the real PostgreSQL ownership boundaries. */
@SpringBootTest
@Testcontainers
@DisplayName("Current collection evidence and control completion")
class CollectionResultIntegrationTest {
  @Container private static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  private static final Instant OBSERVED = Instant.parse("2026-10-19T16:00:00Z");
  private static final UUID CONTROL = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private static final UUID SCOPE = UUID.fromString("00000000-0000-4000-8000-000000000153");
  @MockitoBean private Clock clock;
  @Autowired private CollectorRuntimeService runtimes;
  @Autowired private CollectionCycleService cycles;
  @Autowired private CollectionResultService results;
  @Autowired private CollectionStore store;
  @Autowired private JdbcTemplate sql;
  @Autowired private PlatformTransactionManager transactions;
  @Autowired private SportingIdentityService identities;
  @Autowired private SeasonService seasons;
  private CollectionState.Cycle cycle;

  @Test
  @DisplayName("A success in another scope leaves an existing outage unchanged")
  void retainsUnrelatedFailure() {
    // Given
    UUID other = UUID.fromString("00000000-0000-4000-8000-000000000154");
    sql.update(
        "INSERT INTO collection_target(cycle_id,scope_id,kind) VALUES (?,?,'CLUB_SHEET')",
        cycle.id(),
        other);
    results.record(
        cycle.id(), evidence(1, CollectionPhaseEnum.ACQUISITION, CollectionOutcomeEnum.FAILED));

    // When
    results.record(
        cycle.id(),
        new RecordCollectionResult(
            other,
            CollectionStageEnum.CLUB_SHEET,
            CollectionPhaseEnum.ACQUISITION,
            2,
            OBSERVED.plusSeconds(2),
            CollectionOutcomeEnum.SUCCESS,
            null,
            null,
            1L,
            0L));

    // Then
    assertThat(current(CollectionPhaseEnum.ACQUISITION).outcome())
        .isEqualTo(CollectionOutcomeEnum.FAILED);
    assertThat(current(CollectionPhaseEnum.ACQUISITION).firstFailureAt())
        .isEqualTo(OBSERVED.plusSeconds(1));
    CollectionState.ResultPage first = store.results(CONTROL, 0, 1);
    assertThat(first.items())
        .singleElement()
        .satisfies(item -> assertThat(item.scopeId()).isEqualTo(SCOPE));
    assertThat(first.hasNext()).isTrue();
    assertThat(store.results(CONTROL, 1, 1).items())
        .singleElement()
        .satisfies(item -> assertThat(item.scopeId()).isEqualTo(other));
  }

  @Test
  @DisplayName("An empty selected passage cannot create full-control recovery")
  void doesNotRecoverEmptySelection() {
    // Given
    sql.update("DELETE FROM collection_target WHERE cycle_id = ?", cycle.id());

    // When
    results.complete(cycle.id(), cycle.startedAt().plusSeconds(1));

    // Then
    assertThat(control().lastSuccessAt()).isNull();
    assertThat(control().lastAttemptAt()).isNull();
  }

  @Test
  @DisplayName("Candidate validation cannot end through the control completion operation")
  void refusesCandidateCompletion() {
    // Given
    sql.update(
        "UPDATE collection_cycle SET control_id = NULL, source_binding_id = ? WHERE id = ?",
        SCOPE,
        cycle.id());

    // When / Then
    assertThatThrownBy(() -> results.complete(cycle.id(), cycle.startedAt().plusSeconds(1)))
        .isInstanceOf(CollectionConflictException.class);
    assertThat(cycles.get(cycle.id()).completedAt()).isNull();
  }

  /**
   * Applies the real disposable baseline and registers application-only database credentials.
   *
   * @param properties isolated application connection settings
   * @throws Exception if the disposable baseline cannot be migrated
   */
  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  /** Admits a fresh seasonless control and freezes one synthetic authorized resource. */
  @BeforeEach
  void admitPassage() {
    when(clock.instant()).thenReturn(OBSERVED);
    sql.update("DELETE FROM collection_result");
    sql.update("DELETE FROM collection_cycle");
    sql.update(
        "UPDATE collection_control SET enabled = TRUE, current_cycle_id = NULL, last_success_at = NULL, last_attempt_at = NULL WHERE id = ?",
        CONTROL);
    UUID startup = UUID.randomUUID();
    runtimes.register(runtimes.current().revision(), startup);
    cycle =
        cycles
            .admit(
                new CollectionState.StartCycle(
                    UUID.randomUUID(), startup, CONTROL, null, control().revision(), null))
            .cycle();
    sql.update("DELETE FROM collection_target WHERE cycle_id = ?", cycle.id());
    sql.update(
        "INSERT INTO collection_target(cycle_id,scope_id,kind) VALUES (?,?,'CLUB_SHEET')",
        cycle.id(),
        SCOPE);
  }

  @Test
  @DisplayName("Retains an acquisition success when integration fails")
  void separatesIntegrationFailure() {
    // Given
    results.record(
        cycle.id(), evidence(1, CollectionPhaseEnum.ACQUISITION, CollectionOutcomeEnum.SUCCESS));

    // When
    results.record(
        cycle.id(), evidence(1, CollectionPhaseEnum.INTEGRATION, CollectionOutcomeEnum.FAILED));

    // Then
    assertThat(current(CollectionPhaseEnum.ACQUISITION).lastSuccessAt())
        .isEqualTo(OBSERVED.plusSeconds(1));
    assertThat(current(CollectionPhaseEnum.INTEGRATION).lastSuccessAt()).isNull();
    assertThat(current(CollectionPhaseEnum.INTEGRATION).firstFailureAt())
        .isEqualTo(OBSERVED.plusSeconds(1));
    assertThat(current(CollectionPhaseEnum.INTEGRATION).obtainedCount()).isNull();
  }

  @Test
  @DisplayName("Ignores older and duplicate evidence without clearing an outage")
  void ignoresOldEvidence() {
    // Given
    results.record(
        cycle.id(), evidence(3, CollectionPhaseEnum.ACQUISITION, CollectionOutcomeEnum.FAILED));

    // When
    results.record(
        cycle.id(), evidence(2, CollectionPhaseEnum.ACQUISITION, CollectionOutcomeEnum.SUCCESS));
    results.record(
        cycle.id(), evidence(3, CollectionPhaseEnum.ACQUISITION, CollectionOutcomeEnum.FAILED));

    // Then
    assertThat(current(CollectionPhaseEnum.ACQUISITION).outcome())
        .isEqualTo(CollectionOutcomeEnum.FAILED);
    assertThat(current(CollectionPhaseEnum.ACQUISITION).lastSuccessAt()).isNull();
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM collection_result", Integer.class))
        .isEqualTo(1);
  }

  @Test
  @DisplayName("Keeps the same key and first failure across successive cycles")
  void retainsOutageAcrossCycles() {
    // Given
    results.record(
        cycle.id(), evidence(5, CollectionPhaseEnum.ACQUISITION, CollectionOutcomeEnum.FAILED));
    results.complete(cycle.id(), cycle.startedAt().plusSeconds(1));
    cycle =
        cycles
            .admit(
                new CollectionState.StartCycle(
                    UUID.randomUUID(),
                    cycle.incarnationId(),
                    CONTROL,
                    null,
                    control().revision(),
                    null))
            .cycle();
    sql.update("DELETE FROM collection_target WHERE cycle_id = ?", cycle.id());
    sql.update(
        "INSERT INTO collection_target(cycle_id,scope_id,kind) VALUES (?,?,'CLUB_SHEET')",
        cycle.id(),
        SCOPE);

    // When
    results.record(
        cycle.id(), evidence(1, CollectionPhaseEnum.ACQUISITION, CollectionOutcomeEnum.PARTIAL));

    // Then
    assertThat(current(CollectionPhaseEnum.ACQUISITION).firstFailureAt())
        .isEqualTo(OBSERVED.plusSeconds(5));
    assertThat(current(CollectionPhaseEnum.ACQUISITION).readOrdinal()).isEqualTo(1);
    assertThat(current(CollectionPhaseEnum.ACQUISITION).cycleOrder()).isEqualTo(cycle.cycleOrder());
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM collection_result", Integer.class))
        .isEqualTo(1);
  }

  @Test
  @DisplayName("Completes partial work without advancing full-control success")
  void completesPartialWork() {
    // Given
    results.record(
        cycle.id(), evidence(1, CollectionPhaseEnum.ACQUISITION, CollectionOutcomeEnum.SUCCESS));
    results.record(
        cycle.id(), evidence(1, CollectionPhaseEnum.INTEGRATION, CollectionOutcomeEnum.PARTIAL));

    // When
    CollectionState.Cycle completed =
        results.complete(cycle.id(), cycle.startedAt().plusSeconds(1));

    // Then
    assertThat(completed.completedAt()).isEqualTo(cycle.startedAt().plusSeconds(1));
    assertThat(control().lastSuccessAt()).isNull();
  }

  @ParameterizedTest
  @EnumSource(CollectionTargetKindEnum.class)
  @DisplayName("Advances full success for each selected role only with both successful phases")
  void recordsFullSuccess(CollectionTargetKindEnum kind) {
    // Given
    sql.update("UPDATE collection_target SET kind = ? WHERE cycle_id = ?", kind.name(), cycle.id());
    long revision = control().revision();
    for (CollectionPhaseEnum phase : CollectionPhaseEnum.values()) {
      results.record(
          cycle.id(),
          new RecordCollectionResult(
              SCOPE,
              CollectionStageEnum.fromValue(kind.getValue()),
              phase,
              1,
              OBSERVED.plusSeconds(1),
              CollectionOutcomeEnum.SUCCESS,
              null,
              null,
              1L,
              0L));
    }

    // When
    results.complete(cycle.id(), cycle.startedAt().plusSeconds(1));

    // Then
    assertThat(control().lastSuccessAt()).isEqualTo(cycle.startedAt().plusSeconds(1));
    assertThat(control().lastAttemptAt()).isEqualTo(OBSERVED.plusSeconds(1));
    assertThat(control().revision()).isEqualTo(revision);
  }

  @ParameterizedTest
  @CsvSource({"1, 2", "2, 2", "3, 3"})
  @DisplayName("Retains the latest actual attempt without changing the operator revision")
  void retainsLatestAttempt(int nextSeconds, int expectedSeconds) {
    // Given
    results.record(
        cycle.id(), evidence(2, CollectionPhaseEnum.ACQUISITION, CollectionOutcomeEnum.SUCCESS));
    long revision = control().revision();
    RecordCollectionResult next =
        new RecordCollectionResult(
            SCOPE,
            CollectionStageEnum.CLUB_SHEET,
            CollectionPhaseEnum.ACQUISITION,
            3,
            OBSERVED.plusSeconds(nextSeconds),
            CollectionOutcomeEnum.SUCCESS,
            null,
            null,
            1L,
            0L);

    // When
    results.record(cycle.id(), next);

    // Then
    assertThat(control().lastAttemptAt()).isEqualTo(OBSERVED.plusSeconds(expectedSeconds));
    assertThat(control().revision()).isEqualTo(revision);
  }

  @ParameterizedTest
  @EnumSource(CollectionPhaseEnum.class)
  @DisplayName("A selected role with a missing phase cannot establish full success")
  void refusesIncompletePhases(CollectionPhaseEnum phase) {
    // Given
    results.record(cycle.id(), evidence(1, phase, CollectionOutcomeEnum.SUCCESS));

    // When
    results.complete(cycle.id(), OBSERVED.plusSeconds(2));

    // Then
    assertThat(control().lastSuccessAt()).isNull();
  }

  @Test
  @DisplayName("A successful role cannot cover a different selected role for the same scope")
  void refusesMissingRole() {
    // Given
    sql.update(
        "INSERT INTO collection_target(cycle_id, scope_id, kind) VALUES (?, ?, 'GEOCODING')",
        cycle.id(),
        SCOPE);
    results.record(
        cycle.id(), evidence(1, CollectionPhaseEnum.ACQUISITION, CollectionOutcomeEnum.SUCCESS));
    results.record(
        cycle.id(), evidence(1, CollectionPhaseEnum.INTEGRATION, CollectionOutcomeEnum.SUCCESS));

    // When
    results.complete(cycle.id(), OBSERVED.plusSeconds(2));

    // Then
    assertThat(control().lastSuccessAt()).isNull();
  }

  @Test
  @DisplayName("Accepts identical terminal submission and refuses a conflicting completion")
  void enforcesTerminalIdentity() {
    // Given
    Instant completed = OBSERVED.plusSeconds(1).plusNanos(123_456_789);
    results.complete(cycle.id(), completed);

    // When
    CollectionState.Cycle repeated = results.complete(cycle.id(), completed);

    // Then
    assertThat(repeated.completedAt()).isEqualTo(OBSERVED.plusSeconds(1).plusNanos(123_456_000));
    assertThatThrownBy(() -> results.complete(cycle.id(), completed.plusSeconds(1)))
        .isInstanceOf(CollectionConflictException.class);
    assertThatThrownBy(
            () ->
                results.record(
                    cycle.id(),
                    evidence(1, CollectionPhaseEnum.ACQUISITION, CollectionOutcomeEnum.SUCCESS)))
        .isInstanceOf(CollectionConflictException.class);
  }

  @Test
  @DisplayName("Rejects a result for a role absent from the authorized snapshot")
  void rejectsUnselectedRole() {
    // Given
    RecordCollectionResult unselected =
        new RecordCollectionResult(
            SCOPE,
            CollectionStageEnum.GEOCODING,
            CollectionPhaseEnum.ACQUISITION,
            1,
            OBSERVED,
            CollectionOutcomeEnum.SUCCESS,
            null,
            null,
            null,
            null);

    // When / Then
    assertThatThrownBy(() -> results.record(cycle.id(), unselected))
        .isInstanceOf(CollectionConflictException.class);
    assertThat(sql.queryForObject("SELECT COUNT(*) FROM collection_result", Integer.class))
        .isZero();
  }

  @ParameterizedTest
  @EnumSource(
      value = CollectionStageEnum.class,
      names = {"DETAILS", "LOGO"})
  @DisplayName("Resolves match and team scopes through their actual admitted calendar")
  void checksChildMembership(CollectionStageEnum stage) {
    // Given
    MatchView admitted = match("admitted-" + stage);
    MatchView outside = match("outside-" + stage);
    sql.update(
        "INSERT INTO collection_target(cycle_id,scope_id,kind) VALUES (?,?,'CALENDAR')",
        cycle.id(),
        admitted.poolId());
    UUID selected = stage == CollectionStageEnum.DETAILS ? admitted.id() : admitted.homeTeamId();
    UUID unselected = stage == CollectionStageEnum.DETAILS ? outside.id() : outside.homeTeamId();
    RecordCollectionResult accepted =
        new RecordCollectionResult(
            selected,
            stage,
            CollectionPhaseEnum.ACQUISITION,
            1,
            OBSERVED,
            CollectionOutcomeEnum.SUCCESS,
            null,
            null,
            null,
            null);
    RecordCollectionResult refused =
        new RecordCollectionResult(
            unselected,
            stage,
            CollectionPhaseEnum.ACQUISITION,
            2,
            OBSERVED,
            CollectionOutcomeEnum.SUCCESS,
            null,
            null,
            null,
            null);

    // When
    results.record(cycle.id(), accepted);

    // Then
    assertThat(store.result(CONTROL, selected, stage, CollectionPhaseEnum.ACQUISITION)).isPresent();
    assertThatThrownBy(() -> results.record(cycle.id(), refused))
        .isInstanceOf(CollectionConflictException.class);
    assertThat(store.result(CONTROL, unselected, stage, CollectionPhaseEnum.ACQUISITION)).isEmpty();
  }

  /**
   * Establishes real sporting memberships without claiming provider or ingestion qualification.
   *
   * @param reference distinct synthetic pool and participant context
   * @return match whose participants belong only to that pool
   */
  private MatchView match(String reference) {
    UUID division = UUID.randomUUID();
    sql.update(
        "INSERT INTO sporting_division(id,name,active,color) VALUES (?, ?,TRUE,'#112233')",
        division,
        reference);
    UUID pool =
        identities
            .establishPool(
                new PoolKey(
                    CollectionProviderEnum.FFVB,
                    seasons.getOrCreate(2026).id(),
                    "SYNTHETIC",
                    reference,
                    null,
                    null,
                    reference),
                reference,
                reference,
                new SportingClassification(division, SportFormatEnum._6X6, SportGenderEnum.MALE))
            .id();
    return identities.identifyMatch(
        pool,
        "M1",
        new TeamCandidate(null, reference + " Home", "000153", null),
        new TeamCandidate(null, reference + " Away", "000154", null));
  }

  /**
   * Reads the control inside its owning persistence transaction.
   *
   * @return current control detached inside its owning read transaction
   */
  private CollectionState.Control control() {
    return new TransactionTemplate(transactions)
        .execute(status -> store.control(CONTROL).orElseThrow());
  }

  /**
   * Reads the selected phase independently from the other phase.
   *
   * @param phase independent phase
   * @return actual persisted evidence for the selected resource
   */
  private CollectionResult current(CollectionPhaseEnum phase) {
    return store.result(CONTROL, SCOPE, CollectionStageEnum.CLUB_SHEET, phase).orElseThrow();
  }

  /**
   * Supplies unmeasured counts so a failed attempt cannot silently turn them into zero.
   *
   * @param ordinal logical read order
   * @param phase independent owner phase
   * @param outcome explicit current outcome
   * @return synthetic operational evidence without provider payloads
   */
  private RecordCollectionResult evidence(
      long ordinal, CollectionPhaseEnum phase, CollectionOutcomeEnum outcome) {
    return new RecordCollectionResult(
        SCOPE,
        CollectionStageEnum.CLUB_SHEET,
        phase,
        ordinal,
        OBSERVED.plusSeconds(ordinal),
        outcome,
        null,
        null,
        null,
        null);
  }
}
