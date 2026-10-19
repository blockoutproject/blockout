package com.blockout.collector.acquisition.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.collector.acquisition.ffvb.FfvbAcquisitionException;
import com.blockout.collector.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.collector.generated.ingestion.model.CollectionModeEnum;
import com.blockout.collector.generated.ingestion.model.CollectionOutcomeEnum;
import com.blockout.collector.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.collector.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.collector.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.collector.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.collector.generated.ingestion.model.SourceValidationStateEnum;
import com.blockout.collector.generated.ingestion.model.StandingsPublicationStateEnum;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** Isolates passage decisions while using real lifecycle-issued admitted capabilities. */
@DisplayName("Bounded admitted passage and uncertain terminal writes")
class CollectPassageTest {
  private static final Instant NOW = Instant.parse("2026-10-19T12:00:00Z");
  private static final UUID CONTROL = UUID.fromString("00000000-0000-4000-8000-000000000153");
  private static final UUID POOL = UUID.fromString("00000000-0000-4000-8000-000000000154");
  private final CollectionBackend backend = mock(CollectionBackend.class);
  private final SportingBackend sporting = mock(SportingBackend.class);
  private final FfvbAcquisition ffvb = mock(FfvbAcquisition.class);
  private final CollectorLifecycle lifecycle = new CollectorLifecycle(backend);
  private final CollectPassage passage =
      new CollectPassage(backend, sporting, ffvb, lifecycle, Clock.fixed(NOW, ZoneOffset.UTC));

  @Test
  @DisplayName("Keeps independent standings when calendar acquisition fails")
  void continuesIndependentStage() {
    // Given
    CollectorLifecycle.AdmittedCycle admitted = admit(false);
    CollectionBackend.Target calendar = target(CollectionTargetKindEnum.CALENDAR);
    CollectionBackend.Target table = target(CollectionTargetKindEnum.STANDINGS);
    when(backend.targets(admitted.getCycle().id(), 0))
        .thenReturn(new CollectionBackend.TargetPage(List.of(calendar, table), 0, false));
    when(ffvb.calendar(calendar)).thenThrow(new FfvbAcquisitionException("Wrong season"));
    SportingObservation.Standings standings =
        new SportingObservation.Standings(
            StandingsPublicationStateEnum.PUBLISHED, List.of(), List.of());
    when(ffvb.standings(table)).thenReturn(standings);
    when(sporting.standings(eq(POOL), any(), eq(standings)))
        .thenReturn(
            new SportingObservation.Outcome(
                "TST", ObservationOutcomeEnum.ACCEPTED, POOL, null, null, null));
    when(backend.complete(admitted.getCycle().id(), NOW)).thenReturn(completed(admitted, NOW));

    // When
    boolean finished = passage.execute(admitted);

    // Then
    assertThat(finished).isTrue();
    ArgumentCaptor<CollectionBackend.Result> results =
        ArgumentCaptor.forClass(CollectionBackend.Result.class);
    verify(backend, times(3)).record(eq(admitted.getCycle().id()), results.capture());
    assertThat(results.getAllValues())
        .extracting(CollectionBackend.Result::outcome)
        .containsExactly(
            CollectionOutcomeEnum.FAILED,
            CollectionOutcomeEnum.SUCCESS,
            CollectionOutcomeEnum.SUCCESS);
    assertThat(results.getAllValues())
        .extracting(CollectionBackend.Result::readOrdinal)
        .containsExactly(1L, 2L, 2L);
    verify(sporting, never()).calendar(any(), any(), any());
  }

  @Test
  @DisplayName(
      "Reports an uncertain sporting write without replaying it or claiming measured counts")
  void preservesUncertainIntegration() {
    // Given
    CollectorLifecycle.AdmittedCycle admitted = admit(false);
    CollectionBackend.Target target = target(CollectionTargetKindEnum.CALENDAR);
    when(backend.targets(admitted.getCycle().id(), 0))
        .thenReturn(new CollectionBackend.TargetPage(List.of(target), 0, false));
    SportingObservation.Calendar calendar =
        new SportingObservation.Calendar(true, List.of(), List.of(), List.of());
    when(ffvb.calendar(target)).thenReturn(calendar);
    when(sporting.calendar(eq(POOL), any(), eq(calendar))).thenThrow(uncertain());
    when(backend.complete(admitted.getCycle().id(), NOW)).thenReturn(completed(admitted, NOW));

    // When
    passage.execute(admitted);

    // Then
    verify(sporting).calendar(eq(POOL), any(), eq(calendar));
    ArgumentCaptor<CollectionBackend.Result> results =
        ArgumentCaptor.forClass(CollectionBackend.Result.class);
    verify(backend, times(2)).record(eq(admitted.getCycle().id()), results.capture());
    CollectionBackend.Result integration = results.getAllValues().getLast();
    assertThat(integration.phase()).isEqualTo(CollectionPhaseEnum.INTEGRATION);
    assertThat(integration.outcome()).isEqualTo(CollectionOutcomeEnum.UNCONFIRMED);
    assertThat(integration.obtainedCount()).isNull();
    assertThat(integration.rejectedCount()).isNull();
    verify(backend).complete(admitted.getCycle().id(), NOW);
  }

  @Test
  @DisplayName("Preserves 99 accepted matches and one rejected match as partial integration")
  void preservesPartialIntegration() {
    // Given
    CollectorLifecycle.AdmittedCycle admitted = admit(false);
    CollectionBackend.Target target = target(CollectionTargetKindEnum.CALENDAR);
    when(backend.targets(admitted.getCycle().id(), 0))
        .thenReturn(new CollectionBackend.TargetPage(List.of(target), 0, false));
    List<SportingObservation.Match> matches =
        IntStream.rangeClosed(1, 100)
            .mapToObj(
                index ->
                    new SportingObservation.Match(
                        "M" + index,
                        new SportingObservation.Team("Home " + index, null, "000001", null),
                        new SportingObservation.Team("Away " + index, null, "000002", null),
                        SportingObservation.Facts.builder().build(),
                        null))
            .toList();
    List<SportingObservation.Outcome> outcomes =
        IntStream.rangeClosed(1, 100)
            .mapToObj(
                index ->
                    new SportingObservation.Outcome(
                        "M" + index,
                        index == 100
                            ? ObservationOutcomeEnum.REJECTED
                            : ObservationOutcomeEnum.ACCEPTED,
                        null,
                        null,
                        null,
                        null))
            .toList();
    when(ffvb.calendar(target))
        .thenReturn(new SportingObservation.Calendar(true, matches, List.of(), List.of()));
    when(sporting.calendar(eq(POOL), any(), any()))
        .thenReturn(new SportingObservation.CalendarOutcome(outcomes, 99, 0, 0, 1, false));
    when(backend.complete(admitted.getCycle().id(), NOW)).thenReturn(completed(admitted, NOW));

    // When
    passage.execute(admitted);

    // Then
    ArgumentCaptor<CollectionBackend.Result> results =
        ArgumentCaptor.forClass(CollectionBackend.Result.class);
    verify(backend, times(2)).record(eq(admitted.getCycle().id()), results.capture());
    assertThat(results.getAllValues().getLast().outcome()).isEqualTo(CollectionOutcomeEnum.PARTIAL);
    assertThat(results.getAllValues().getLast().obtainedCount()).isEqualTo(99);
    assertThat(results.getAllValues().getLast().rejectedCount()).isEqualTo(1);
  }

  @Test
  @DisplayName("Stops a superseded incarnation before another stage or sporting write")
  void stopsAfterContextRefusal() {
    // Given
    CollectorLifecycle.AdmittedCycle admitted = admit(false);
    CollectionBackend.Target calendar = target(CollectionTargetKindEnum.CALENDAR);
    CollectionBackend.Target standings = target(CollectionTargetKindEnum.STANDINGS);
    when(backend.targets(admitted.getCycle().id(), 0))
        .thenReturn(new CollectionBackend.TargetPage(List.of(calendar, standings), 0, false));
    when(ffvb.calendar(calendar))
        .thenReturn(new SportingObservation.Calendar(true, List.of(), List.of(), List.of()));
    doThrow(new CollectionBackendFailure(CollectionBackendFailure.Kind.CONFLICT, null))
        .when(backend)
        .record(eq(admitted.getCycle().id()), any());
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(2, UUID.randomUUID()));

    // When
    boolean completed = passage.execute(admitted);

    // Then
    assertThat(completed).isFalse();
    verifyNoInteractions(sporting);
    verify(ffvb, never()).standings(any());
    verify(backend, never()).complete(any(), any());
    assertThatThrownBy(admitted::nextReadOrdinal).isInstanceOf(IllegalStateException.class);
  }

  @Test
  @DisplayName("An empty target selection creates no observation or recovery evidence")
  void leavesEmptySelectionUnobserved() {
    // Given
    CollectorLifecycle.AdmittedCycle admitted = admit(false);
    when(backend.targets(admitted.getCycle().id(), 0))
        .thenReturn(new CollectionBackend.TargetPage(List.of(), 0, false));
    when(backend.complete(admitted.getCycle().id(), NOW)).thenReturn(completed(admitted, NOW));

    // When
    passage.execute(admitted);

    // Then
    verifyNoInteractions(ffvb, sporting);
    verify(backend, never()).record(any(), any());
    verify(backend).complete(admitted.getCycle().id(), NOW);
  }

  @Test
  @DisplayName("Confirms an uncertain completion by one read of the original cycle")
  void confirmsCompletionOnce() {
    // Given
    CollectorLifecycle.AdmittedCycle admitted = admit(false);
    when(backend.complete(admitted.getCycle().id(), NOW)).thenThrow(uncertain());
    when(backend.cycle(admitted.getCycle().id())).thenReturn(completed(admitted, NOW));

    // When
    boolean confirmed = lifecycle.complete(admitted, NOW);

    // Then
    assertThat(confirmed).isTrue();
    verify(backend).complete(admitted.getCycle().id(), NOW);
    verify(backend).cycle(admitted.getCycle().id());
  }

  @Test
  @DisplayName("Confirms nanosecond clock completion at the persisted microsecond precision")
  void confirmsPersistedPrecision() {
    // Given
    CollectorLifecycle.AdmittedCycle admitted = admit(false);
    Instant actualEnd = NOW.plusNanos(123_456_789);
    Instant persistedEnd = NOW.plusNanos(123_456_000);
    when(backend.complete(admitted.getCycle().id(), persistedEnd))
        .thenReturn(completed(admitted, persistedEnd));

    // When
    boolean confirmed = lifecycle.complete(admitted, actualEnd);

    // Then
    assertThat(confirmed).isTrue();
    verify(backend).complete(admitted.getCycle().id(), persistedEnd);
    verify(backend, never()).cycle(any());
  }

  @Test
  @DisplayName("Leaves an unconfirmed completion blocked after a single confirmation read")
  void leavesUnconfirmedCompletionBlocked() {
    // Given
    CollectorLifecycle.AdmittedCycle admitted = admit(false);
    when(backend.complete(admitted.getCycle().id(), NOW)).thenThrow(uncertain());
    when(backend.cycle(admitted.getCycle().id())).thenReturn(admitted.getCycle());

    // When
    boolean confirmed = lifecycle.complete(admitted, NOW);

    // Then
    assertThat(confirmed).isFalse();
    verify(backend).complete(admitted.getCycle().id(), NOW);
    verify(backend).cycle(admitted.getCycle().id());
  }

  @Test
  @DisplayName("Confirms atomic candidate completion without substituting a control completion")
  void confirmsCandidateResultOnce() {
    // Given
    CollectorLifecycle.AdmittedCycle admitted = admit(true);
    CollectionBackend.Validation result =
        new CollectionBackend.Validation(
            admitted.getCycle().id(), SourceValidationStateEnum.QUALIFIED, NOW, "2026/2027", null);
    doThrow(uncertain()).when(backend).validate(CONTROL, result);
    when(backend.cycle(admitted.getCycle().id()))
        .thenReturn(completed(admitted, NOW.plusSeconds(1)));

    // When
    boolean confirmed = lifecycle.validate(admitted, result);

    // Then
    assertThat(confirmed).isTrue();
    verify(backend).validate(CONTROL, result);
    verify(backend).cycle(admitted.getCycle().id());
    verify(backend, never()).complete(any(), any());
  }

  /**
   * Creates a capability through real startup and admission decisions.
   *
   * @param candidate selects the actual conditional admission purpose
   * @return a real lifecycle-issued capability
   */
  private CollectorLifecycle.AdmittedCycle admit(boolean candidate) {
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(0, null));
    when(backend.register(0, lifecycle.getIncarnationId()))
        .thenReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()));
    lifecycle.start();
    when(backend.admit(any()))
        .thenAnswer(
            call -> {
              CollectionBackend.StartCycle command = call.getArgument(0);
              return new CollectionBackend.Cycle(
                  command.cycleId(),
                  command.incarnationId(),
                  command.controlId(),
                  command.sourceBindingId(),
                  1,
                  candidate ? null : CollectionModeEnum.PERIODIC,
                  CollectionCycleStateEnum.RUNNING,
                  candidate,
                  null);
            });
    return lifecycle.admit(candidate ? null : CONTROL, candidate ? CONTROL : null, 0, null);
  }

  /**
   * Returns the original context with the exact terminal timestamp.
   *
   * @param admitted original capability
   * @param completedAt accepted backend terminal time
   * @return the same context with its actual accepted completion
   */
  private CollectionBackend.Cycle completed(
      CollectorLifecycle.AdmittedCycle admitted, Instant completedAt) {
    CollectionBackend.Cycle cycle = admitted.getCycle();
    return new CollectionBackend.Cycle(
        cycle.id(),
        cycle.incarnationId(),
        cycle.controlId(),
        cycle.sourceBindingId(),
        cycle.cycleOrder(),
        cycle.mode(),
        CollectionCycleStateEnum.COMPLETED,
        cycle.hasCandidate(),
        completedAt);
  }

  /**
   * Supplies a synthetic selected pool for one stage.
   *
   * @param kind independently selected stage
   * @return synthetic admitted pool context
   */
  private CollectionBackend.Target target(CollectionTargetKindEnum kind) {
    return CollectionBackend.Target.builder()
        .scopeId(POOL)
        .poolId(POOL)
        .provider(CollectionProviderEnum.FFVB)
        .kind(kind)
        .build();
  }

  /**
   * Models response loss without a network side effect.
   *
   * @return a response-loss classification without a real network side effect
   */
  private CollectionBackendFailure uncertain() {
    return new CollectionBackendFailure(
        CollectionBackendFailure.Kind.UNCONFIRMED,
        new java.io.IOException("Synthetic response loss"));
  }
}
