package com.blockout.backend.collection.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.collection.application.model.CollectionResult;
import com.blockout.backend.collection.application.model.CollectionStageMapper;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.model.RecordCollectionResult;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.collection.application.service.CollectionCycleService;
import com.blockout.backend.collection.application.service.CollectionResultService;
import com.blockout.backend.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.sporting.application.service.SportingReadService;
import java.net.URI;
import java.time.Instant;
import java.util.Optional;
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
class CollectionOperationalEvidenceTest {
  private static final UUID CONTROL = UUID.fromString("00000000-0000-4000-8000-000000000202");
  private static final UUID SCOPE = UUID.fromString("00000000-0000-4000-8000-000000000203");
  private static final UUID CYCLE = UUID.fromString("00000000-0000-4000-8000-000000000204");
  private static final Instant FIRST = Instant.parse("2026-10-25T00:00:00Z");
  @Mock private CollectionStore store;
  @Mock private CollectionCycleService cycles;
  @Mock private SportingReadService sporting;
  @Mock private CurrentPermissions permissions;
  @Mock private ApplicationEventPublisher events;
  private CollectionResultService service;

  /** Uses real enum mapping while replacing only external application collaborators. */
  @BeforeEach
  void createService() {
    service =
        new CollectionResultService(
            store,
            cycles,
            sporting,
            permissions,
            events,
            Mappers.getMapper(CollectionStageMapper.class));
  }

  @Test
  @DisplayName("Requests committed diagnostics on the first competition failure")
  void reportsFirstCompetitionFailure() {
    // Given
    admitted(2, CollectionStageEnum.CALENDAR);
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
    ArgumentCaptor<CollectionResult> written = ArgumentCaptor.forClass(CollectionResult.class);
    verify(store).saveResult(org.mockito.ArgumentMatchers.eq(CONTROL), written.capture());
    assertThat(written.getValue().firstFailureAt()).isEqualTo(FIRST);
    verify(events).publishEvent(any(Object.class));
  }

  @ParameterizedTest
  @EnumSource(
      value = CollectionStageEnum.class,
      names = {"CLUB_SHEET", "GEOCODING"})
  @DisplayName("Keeps the original seasonless failure across cycles beyond twenty-four hours")
  void retainsFirstFailureAcrossCycles(CollectionStageEnum stage) {
    // Given
    admitted(3, stage);
    when(store.result(CONTROL, SCOPE, stage, CollectionPhaseEnum.ACQUISITION))
        .thenReturn(Optional.of(previous(stage, CollectionPhaseEnum.ACQUISITION, 2, 90)));
    RecordCollectionResult next =
        evidence(
            stage,
            CollectionPhaseEnum.ACQUISITION,
            1,
            FIRST.plusSeconds(86401),
            CollectionOutcomeEnum.PARTIAL);

    // When
    service.record(CYCLE, next);

    // Then
    ArgumentCaptor<CollectionResult> written = ArgumentCaptor.forClass(CollectionResult.class);
    verify(store).saveResult(org.mockito.ArgumentMatchers.eq(CONTROL), written.capture());
    assertThat(written.getValue().firstFailureAt()).isEqualTo(FIRST);
    assertThat(written.getValue().firstStructuralFailureAt()).isEqualTo(FIRST);
    assertThat(written.getValue().lastSuccessAt()).isEqualTo(FIRST.minusSeconds(100));
    assertThat(written.getValue().obtainedCount()).isNull();
  }

  @ParameterizedTest
  @CsvSource({"1, 99", "2, 4", "2, 5"})
  @DisplayName("Ignores older cycles and duplicate ordinals without a recovery diagnostic")
  void ignoresStaleEvidence(long cycleOrder, long ordinal) {
    // Given
    admitted(cycleOrder, CollectionStageEnum.CALENDAR);
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
    admitted(3, CollectionStageEnum.GEOCODING);
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
    verify(store).saveResult(org.mockito.ArgumentMatchers.eq(CONTROL), written.capture());
    assertThat(written.getValue().phase()).isEqualTo(phase);
    assertThat(written.getValue().firstFailureAt()).isNull();
    assertThat(written.getValue().firstStructuralFailureAt()).isNull();
    assertThat(written.getValue().lastSuccessAt()).isEqualTo(empty.observedAt());
    verify(events).publishEvent(any(Object.class));
  }

  @Test
  @DisplayName("Completing an empty passage creates no observation or recovery")
  void completesWithoutInventingEvidence() {
    // Given
    CollectionState.Cycle cycle = cycle(3);
    when(cycles.lockControlPassage(CYCLE)).thenReturn(cycle);
    when(store.cycle(CYCLE)).thenReturn(Optional.of(cycle));

    // When
    service.complete(CYCLE, FIRST.plusSeconds(5));

    // Then
    verify(store, never()).saveResult(any(), any());
    verifyNoInteractions(events);
  }

  @ParameterizedTest
  @EnumSource(CollectionOutcomeEnum.class)
  @DisplayName("Only accepted catalog outcomes request a current classification report")
  void reportsOnlyAcceptedCatalog(CollectionOutcomeEnum outcome) {
    // Given
    admitted(2, CollectionStageEnum.DISCOVERY);

    // When
    service.record(
        CYCLE,
        evidence(
            CollectionStageEnum.DISCOVERY, CollectionPhaseEnum.INTEGRATION, 1, FIRST, outcome));

    // Then
    boolean accepted =
        outcome == CollectionOutcomeEnum.SUCCESS || outcome == CollectionOutcomeEnum.PARTIAL;
    verify(events, org.mockito.Mockito.times(accepted ? 1 : 0))
        .publishEvent(
            any(
                com.blockout.backend.collection.application.service.CollectionOperationalDiagnostics
                    .CatalogObserved.class));
  }

  /**
   * Installs only the exact admitted role; no provider or persistence behavior is simulated.
   *
   * @param order authoritative passage order
   * @param stage actual selected role
   */
  private void admitted(long order, CollectionStageEnum stage) {
    when(cycles.lockControlPassage(CYCLE)).thenReturn(cycle(order));
    when(store.containsTarget(CYCLE, SCOPE, CollectionTargetKindEnum.fromValue(stage.getValue())))
        .thenReturn(true);
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
   * Retains an existing outage and a distinct older usable observation.
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
        FIRST,
        FIRST,
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
