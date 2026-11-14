package com.blockout.backend.collection.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.collection.application.model.CollectionResult;
import com.blockout.backend.collection.application.model.CollectionStageMapper;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.model.RecordCollectionResult;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionFamilyEnum;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.sporting.application.service.ReadSportingAcquisition;
import java.net.URI;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.mapstruct.factory.Mappers;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

/** Pure current-evidence decisions; commit, SQL and native encoding have separate evidence. */
@ExtendWith(MockitoExtension.class)
@DisplayName("Scoped collection operational evidence")
class RecordCollectionResultsTest {
  private static final UUID CONTROL = UUID.fromString("00000000-0000-4000-8000-000000000202");
  private static final UUID SCOPE = UUID.fromString("00000000-0000-4000-8000-000000000203");
  private static final UUID CYCLE = UUID.fromString("00000000-0000-4000-8000-000000000204");
  private static final UUID SEASON = UUID.fromString("00000000-0000-4000-8000-000000000205");
  private static final Instant FIRST = Instant.parse("2026-10-25T00:00:00Z");
  @Mock private CollectionStore store;
  @Mock private CollectionCycleAccess cycleAccess;
  @Mock private ReadSportingAcquisition sporting;
  @Mock private ApplicationEventPublisher events;
  private RecordCollectionResults service;

  /** Uses real enum mapping while replacing only external application collaborators. */
  @BeforeEach
  void createService() {
    service =
        new RecordCollectionResults(
            store, cycleAccess, sporting, events, Mappers.getMapper(CollectionStageMapper.class));
  }

  @Test
  @DisplayName("Requests committed diagnostics on the first competition failure")
  void reportsFirstCompetitionFailure() {
    // Given
    when(store.lockControl(CONTROL)).thenReturn(control(SEASON, CollectionFamilyEnum.FFVB));
    when(cycleAccess.lockControlPassage(CYCLE)).thenReturn(cycle(2));
    when(store.target(CYCLE, SCOPE, CollectionTargetKindEnum.CALENDAR))
        .thenReturn(Optional.of(target(CollectionTargetKindEnum.CALENDAR)));
    RecordCollectionResult failure =
        evidence(
            CollectionStageEnum.CALENDAR,
            CollectionPhaseEnum.ACQUISITION,
            1,
            FIRST,
            CollectionOutcomeEnum.FAILED);

    // When
    service.record(CYCLE, failure);

    // Then
    ArgumentCaptor<CollectionOperationalDiagnostics.EvidenceChanged> diagnostic =
        ArgumentCaptor.forClass(CollectionOperationalDiagnostics.EvidenceChanged.class);
    verify(events).publishEvent(diagnostic.capture());
    assertThat(diagnostic.getValue().controlId()).isEqualTo(CONTROL);
    assertThat(diagnostic.getValue().seasonId()).isEqualTo(SEASON);
    assertThat(diagnostic.getValue().family()).isEqualTo(CollectionFamilyEnum.FFVB);
    assertThat(diagnostic.getValue().scopeId()).isEqualTo(SCOPE);
    assertThat(diagnostic.getValue().stage()).isEqualTo(CollectionStageEnum.CALENDAR);
    assertThat(diagnostic.getValue().phase()).isEqualTo(CollectionPhaseEnum.ACQUISITION);
    assertThat(diagnostic.getValue().observedAt()).isEqualTo(FIRST);
    assertThat(diagnostic.getValue().outcome()).isEqualTo(CollectionOutcomeEnum.FAILED);
  }

  @ParameterizedTest
  @EnumSource(
      value = CollectionStageEnum.class,
      names = {"CLUB_SHEET", "GEOCODING"})
  @DisplayName("Retains useful success when a later seasonless result is partial")
  void retainsSuccessAcrossCycles(CollectionStageEnum stage) {
    // Given
    CollectionFamilyEnum family =
        stage == CollectionStageEnum.CLUB_SHEET
            ? CollectionFamilyEnum.CLUB_SHEETS
            : CollectionFamilyEnum.GEOCODING;
    when(store.lockControl(CONTROL)).thenReturn(control(null, family));
    when(cycleAccess.lockControlPassage(CYCLE)).thenReturn(cycle(3));
    CollectionTargetKindEnum kind = CollectionTargetKindEnum.fromValue(stage.getValue());
    when(store.target(CYCLE, SCOPE, kind)).thenReturn(Optional.of(target(kind)));
    when(store.result(CONTROL, SCOPE, stage, CollectionPhaseEnum.ACQUISITION))
        .thenReturn(Optional.of(previous(stage, CollectionPhaseEnum.ACQUISITION, 2, 90)));
    RecordCollectionResult next =
        evidence(
            stage,
            CollectionPhaseEnum.ACQUISITION,
            1,
            FIRST.plusSeconds(60),
            CollectionOutcomeEnum.PARTIAL);

    // When
    service.record(CYCLE, next);

    // Then
    ArgumentCaptor<CollectionResult> written = ArgumentCaptor.forClass(CollectionResult.class);
    verify(store).saveResult(eq(CONTROL), written.capture());
    assertThat(written.getValue().lastSuccessAt()).isEqualTo(FIRST.minusSeconds(100));
    assertThat(written.getValue().obtainedCount()).isNull();
  }

  @Test
  @DisplayName("Requests recovery evidence from the previous outcome without an outage clock")
  void reportsRecoveryFromPreviousOutcome() {
    // Given
    when(store.lockControl(CONTROL)).thenReturn(control(SEASON, CollectionFamilyEnum.FFVB));
    when(cycleAccess.lockControlPassage(CYCLE)).thenReturn(cycle(3));
    when(store.target(CYCLE, SCOPE, CollectionTargetKindEnum.CALENDAR))
        .thenReturn(Optional.of(target(CollectionTargetKindEnum.CALENDAR)));
    when(store.result(
            CONTROL, SCOPE, CollectionStageEnum.CALENDAR, CollectionPhaseEnum.ACQUISITION))
        .thenReturn(
            Optional.of(
                new CollectionResult(
                    SCOPE,
                    CollectionStageEnum.CALENDAR,
                    CollectionPhaseEnum.ACQUISITION,
                    2,
                    1,
                    FIRST,
                    CollectionOutcomeEnum.UNCONFIRMED,
                    null,
                    null,
                    null,
                    null,
                    null)));

    // When
    service.record(
        CYCLE,
        evidence(
            CollectionStageEnum.CALENDAR,
            CollectionPhaseEnum.ACQUISITION,
            1,
            FIRST.plusSeconds(1),
            CollectionOutcomeEnum.SUCCESS));

    // Then
    ArgumentCaptor<CollectionOperationalDiagnostics.EvidenceChanged> diagnostic =
        ArgumentCaptor.forClass(CollectionOperationalDiagnostics.EvidenceChanged.class);
    verify(events).publishEvent(diagnostic.capture());
    assertThat(diagnostic.getValue().scopeId()).isEqualTo(SCOPE);
    assertThat(diagnostic.getValue().observedAt()).isEqualTo(FIRST.plusSeconds(1));
    assertThat(diagnostic.getValue().outcome()).isEqualTo(CollectionOutcomeEnum.SUCCESS);
    assertThat(diagnostic.getValue().lastSuccessAt()).isEqualTo(FIRST.plusSeconds(1));
  }

  @ParameterizedTest
  @CsvSource({"1, 99", "2, 4", "2, 5"})
  @DisplayName("Ignores older cycles and duplicate ordinals without a recovery diagnostic")
  void ignoresStaleEvidence(long cycleOrder, long ordinal) {
    // Given
    when(cycleAccess.lockControlPassage(CYCLE)).thenReturn(cycle(cycleOrder));
    when(store.target(CYCLE, SCOPE, CollectionTargetKindEnum.CALENDAR))
        .thenReturn(Optional.of(target(CollectionTargetKindEnum.CALENDAR)));
    when(store.result(
            CONTROL, SCOPE, CollectionStageEnum.CALENDAR, CollectionPhaseEnum.ACQUISITION))
        .thenReturn(
            Optional.of(
                previous(CollectionStageEnum.CALENDAR, CollectionPhaseEnum.ACQUISITION, 2, 5)));

    // When
    service.record(
        CYCLE,
        evidence(
            CollectionStageEnum.CALENDAR,
            CollectionPhaseEnum.ACQUISITION,
            ordinal,
            FIRST.plusSeconds(100),
            CollectionOutcomeEnum.SUCCESS));

    // Then
    verify(store, never()).saveResult(any(), any());
    verifyNoInteractions(events);
  }

  @ParameterizedTest
  @EnumSource(CollectionPhaseEnum.class)
  @DisplayName("Recovers only the exact phase with a new usable observation")
  void recoversExactPhase(CollectionPhaseEnum phase) {
    // Given
    when(store.lockControl(CONTROL)).thenReturn(control(null, CollectionFamilyEnum.GEOCODING));
    when(cycleAccess.lockControlPassage(CYCLE)).thenReturn(cycle(3));
    when(store.target(CYCLE, SCOPE, CollectionTargetKindEnum.GEOCODING))
        .thenReturn(Optional.of(target(CollectionTargetKindEnum.GEOCODING)));
    when(store.result(CONTROL, SCOPE, CollectionStageEnum.GEOCODING, phase))
        .thenReturn(Optional.of(previous(CollectionStageEnum.GEOCODING, phase, 2, 5)));
    RecordCollectionResult empty =
        evidence(
            CollectionStageEnum.GEOCODING,
            phase,
            1,
            FIRST.plusSeconds(86400),
            CollectionOutcomeEnum.SUCCESS);

    // When
    service.record(CYCLE, empty);

    // Then
    ArgumentCaptor<CollectionResult> written = ArgumentCaptor.forClass(CollectionResult.class);
    verify(store).saveResult(eq(CONTROL), written.capture());
    assertThat(written.getValue().phase()).isEqualTo(phase);
    assertThat(written.getValue().lastSuccessAt()).isEqualTo(empty.observedAt());
    ArgumentCaptor<CollectionOperationalDiagnostics.EvidenceChanged> diagnostic =
        ArgumentCaptor.forClass(CollectionOperationalDiagnostics.EvidenceChanged.class);
    verify(events).publishEvent(diagnostic.capture());
    assertThat(diagnostic.getValue().scopeId()).isEqualTo(SCOPE);
    assertThat(diagnostic.getValue().phase()).isEqualTo(phase);
    assertThat(diagnostic.getValue().observedAt()).isEqualTo(empty.observedAt());
    assertThat(diagnostic.getValue().outcome()).isEqualTo(CollectionOutcomeEnum.SUCCESS);
  }

  @Test
  @DisplayName("Completing an empty passage creates no observation or recovery")
  void completesWithoutInventingEvidence() {
    // Given
    CollectionState.Cycle cycle = cycle(3);
    when(cycleAccess.lockControlPassage(CYCLE)).thenReturn(cycle);
    when(store.cycle(CYCLE)).thenReturn(Optional.of(cycle));

    // When
    CollectionState.Cycle completed = service.complete(CYCLE, FIRST.plusSeconds(5));

    // Then
    assertThat(completed).isEqualTo(cycle);
    verify(store).complete(cycle, FIRST.plusSeconds(5));
    verify(store, never()).saveResult(any(), any());
    verifyNoInteractions(events);
  }

  @ParameterizedTest
  @EnumSource(
      value = CollectionOutcomeEnum.class,
      names = {"SUCCESS", "PARTIAL"})
  @DisplayName("Requests a classification report for accepted catalog integration")
  void reportsAcceptedCatalog(CollectionOutcomeEnum outcome) {
    // Given
    when(store.lockControl(CONTROL)).thenReturn(control(SEASON, CollectionFamilyEnum.FFVB));
    when(cycleAccess.lockControlPassage(CYCLE)).thenReturn(cycle(2));
    when(store.target(CYCLE, SCOPE, CollectionTargetKindEnum.DISCOVERY))
        .thenReturn(Optional.of(target(CollectionTargetKindEnum.DISCOVERY)));
    RecordCollectionResult command =
        evidence(CollectionStageEnum.DISCOVERY, CollectionPhaseEnum.INTEGRATION, 1, FIRST, outcome);

    // When
    service.record(CYCLE, command);

    // Then
    verify(events)
        .publishEvent(
            new CollectionOperationalDiagnostics.CatalogObserved(
                SEASON, CollectionProviderEnum.FFVB, FIRST, null, null));
  }

  @ParameterizedTest
  @EnumSource(
      value = CollectionOutcomeEnum.class,
      names = {"SUCCESS", "PARTIAL"},
      mode = EnumSource.Mode.EXCLUDE)
  @DisplayName("Requests no classification report for rejected catalog integration")
  void ignoresRejectedCatalog(CollectionOutcomeEnum outcome) {
    // Given
    when(store.lockControl(CONTROL)).thenReturn(control(SEASON, CollectionFamilyEnum.FFVB));
    when(cycleAccess.lockControlPassage(CYCLE)).thenReturn(cycle(2));
    when(store.target(CYCLE, SCOPE, CollectionTargetKindEnum.DISCOVERY))
        .thenReturn(Optional.of(target(CollectionTargetKindEnum.DISCOVERY)));
    RecordCollectionResult command =
        evidence(CollectionStageEnum.DISCOVERY, CollectionPhaseEnum.INTEGRATION, 1, FIRST, outcome);

    // When
    service.record(CYCLE, command);

    // Then
    verify(events, never())
        .publishEvent(any(CollectionOperationalDiagnostics.CatalogObserved.class));
  }

  private CollectionState.Control control(UUID seasonId, CollectionFamilyEnum family) {
    return new CollectionState.Control(
        CONTROL, seasonId, family, 0, true, null, null, CYCLE, FIRST, null, null, Set.of(),
        Set.of());
  }

  /**
   * Supplies the exact admitted role without unrelated acquisition configuration.
   *
   * @param kind role selected by the scenario
   * @return immutable authorization target for the selected scope
   */
  private CollectionState.Target target(CollectionTargetKindEnum kind) {
    return CollectionState.Target.builder().scopeId(SCOPE).kind(kind).build();
  }

  /**
   * Supplies a real immutable capability to avoid mocking application values.
   *
   * @param order authoritative logical passage order
   * @return synthetic admitted control context
   */
  private CollectionState.Cycle cycle(long order) {
    return new CollectionState.Cycle(
        CYCLE,
        CONTROL,
        CONTROL,
        null,
        order,
        CollectionModeEnum.PERIODIC,
        CollectionCycleStateEnum.RUNNING,
        FIRST,
        null,
        0,
        null,
        null);
  }

  /**
   * Retains a failed outcome and a distinct older usable observation.
   *
   * @param stage exact original role
   * @param phase exact original phase
   * @param order previous authoritative cycle order
   * @param ordinal previous logical read ordinal
   * @return prior current evidence at the selected key
   */
  private CollectionResult previous(
      CollectionStageEnum stage, CollectionPhaseEnum phase, long order, long ordinal) {
    return new CollectionResult(
        SCOPE,
        stage,
        phase,
        order,
        ordinal,
        FIRST,
        CollectionOutcomeEnum.FAILED,
        FIRST.minusSeconds(100),
        null,
        null,
        null,
        null);
  }

  /**
   * Leaves unmeasured counts absent; zero is supplied only by measured scenarios.
   *
   * @param stage selected role
   * @param phase independently observed phase
   * @param ordinal pre-read logical order
   * @param observedAt actual observation instant
   * @param outcome explicit result
   * @return safe synthetic attempt
   */
  private RecordCollectionResult evidence(
      CollectionStageEnum stage,
      CollectionPhaseEnum phase,
      long ordinal,
      Instant observedAt,
      CollectionOutcomeEnum outcome) {
    return new RecordCollectionResult(
        SCOPE,
        stage,
        phase,
        ordinal,
        observedAt,
        outcome,
        outcome == CollectionOutcomeEnum.SUCCESS
            ? null
            : URI.create("urn:blockout:acquisition:failed"),
        null,
        null,
        null);
  }
}
