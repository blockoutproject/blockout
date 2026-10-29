package com.blockout.collector.acquisition.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.collector.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.collector.generated.ingestion.model.CollectionFamilyEnum;
import com.blockout.collector.generated.ingestion.model.CollectionModeEnum;
import com.blockout.collector.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.collector.generated.ingestion.model.CollectionSeasonStateEnum;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.Trigger;
import org.springframework.scheduling.support.SimpleTriggerContext;

/** Native trigger time and dispatch are controlled; provider interpretation has separate tests. */
@DisplayName("Native acquisition scheduling")
class AcquisitionSchedulerTest {
  private static final UUID SEASON = UUID.fromString("00000000-0000-4000-8000-000000000183");
  private static final UUID CONTROL = UUID.fromString("00000000-0000-4000-8000-000000000184");
  private static final UUID REQUEST = UUID.fromString("00000000-0000-4000-8000-000000000185");
  private final CollectionBackend backend = mock(CollectionBackend.class);
  private final CollectPassage passages = mock(CollectPassage.class);
  private final QualifySource qualification = mock(QualifySource.class);
  private final DiscoverSeasonSources discovery = mock(DiscoverSeasonSources.class);
  private final TaskScheduler timer = mock(TaskScheduler.class);
  private final CollectorLifecycle lifecycle = new CollectorLifecycle(backend);

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName(
      "A definite admission refusal releases the scope even when the secondary runtime read is unavailable")
  void preservesDefiniteAdmissionRefusal(boolean validation) {
    // Given
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(0, null));
    when(backend.register(0, lifecycle.getIncarnationId()))
        .thenReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()));
    lifecycle.start();
    AcquisitionScheduler scheduler =
        new AcquisitionScheduler(
            timer, new SyncTaskExecutor(), lifecycle, discovery, passages, qualification);
    scheduler.start();
    org.mockito.ArgumentCaptor<Runnable> scheduled =
        org.mockito.ArgumentCaptor.forClass(Runnable.class);
    verify(timer, times(3)).schedule(scheduled.capture(), any(Trigger.class));
    List<Runnable> tasks = scheduled.getAllValues();
    CollectionBackend.Work work =
        new CollectionBackend.Work(
            validation
                ? List.of()
                : List.of(
                    new CollectionBackend.ControlWork(
                        CONTROL,
                        CollectionFamilyEnum.FFVB,
                        SEASON,
                        0,
                        true,
                        CollectionSeasonStateEnum.ACTIVE,
                        REQUEST,
                        CollectionModeEnum.MANUAL,
                        null)),
            validation ? List.of(new CollectionBackend.ValidationWork(CONTROL, 0)) : List.of());
    when(backend.work(lifecycle.getIncarnationId())).thenReturn(work);
    doThrow(new CollectionBackendFailure(CollectionBackendFailure.Kind.CONFLICT, null))
        .when(backend)
        .admit(any());
    when(backend.current())
        .thenThrow(new CollectionBackendFailure(CollectionBackendFailure.Kind.UNCONFIRMED, null));

    // When an operator revision change causes a definite refusal and its secondary read fails.
    tasks.get(2).run();
    doReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()))
        .when(backend)
        .current();
    tasks.get(2).run();

    // Then: fresh ordinary opportunities remain possible after definite refusal, without supplier
    // work.
    verify(backend, times(2)).admit(any());
    verifyNoInteractions(passages, qualification);
  }

  @Test
  @DisplayName("A superseded work poll stops subsequent ticks without registering again")
  void stopsSupersededWork() {
    // Given
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(0, null));
    when(backend.register(0, lifecycle.getIncarnationId()))
        .thenReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()));
    lifecycle.start();
    AcquisitionScheduler scheduler =
        new AcquisitionScheduler(
            timer, new SyncTaskExecutor(), lifecycle, discovery, passages, qualification);
    scheduler.start();
    org.mockito.ArgumentCaptor<Runnable> scheduled =
        org.mockito.ArgumentCaptor.forClass(Runnable.class);
    verify(timer, times(3)).schedule(scheduled.capture(), any(Trigger.class));
    List<Runnable> tasks = scheduled.getAllValues();
    when(backend.work(lifecycle.getIncarnationId()))
        .thenThrow(new CollectionBackendFailure(CollectionBackendFailure.Kind.CONFLICT, null));
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(2, REQUEST));

    // When
    tasks.get(1).run();
    tasks.get(1).run();

    // Then
    assertThat(lifecycle.isActive()).isFalse();
    verify(backend).work(lifecycle.getIncarnationId());
    verify(backend).register(0, lifecycle.getIncarnationId());
    verify(backend, never()).admit(any());
    verifyNoInteractions(passages, qualification, discovery);
  }

  @ParameterizedTest
  @CsvSource({"false,UNCONFIRMED", "true,UNCONFIRMED", "false,REJECTED", "true,REJECTED"})
  @DisplayName(
      "Uncertain control and candidate admissions retain their original identity across later ticks")
  void retainsUnconfirmedAdmission(boolean validation, CollectionBackendFailure.Kind readFailure) {
    // Given
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(0, null));
    when(backend.register(0, lifecycle.getIncarnationId()))
        .thenReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()));
    lifecycle.start();
    AcquisitionScheduler scheduler =
        new AcquisitionScheduler(
            timer, new SyncTaskExecutor(), lifecycle, discovery, passages, qualification);
    scheduler.start();
    org.mockito.ArgumentCaptor<Runnable> scheduled =
        org.mockito.ArgumentCaptor.forClass(Runnable.class);
    verify(timer, times(3)).schedule(scheduled.capture(), any(Trigger.class));
    List<Runnable> tasks = scheduled.getAllValues();
    CollectionBackend.Work work =
        new CollectionBackend.Work(
            validation
                ? List.of()
                : List.of(
                    new CollectionBackend.ControlWork(
                        CONTROL,
                        CollectionFamilyEnum.FFVB,
                        SEASON,
                        0,
                        true,
                        CollectionSeasonStateEnum.ACTIVE,
                        REQUEST,
                        CollectionModeEnum.MANUAL,
                        null)),
            validation ? List.of(new CollectionBackend.ValidationWork(CONTROL, 0)) : List.of());
    when(backend.work(lifecycle.getIncarnationId())).thenReturn(work);
    doThrow(new CollectionBackendFailure(CollectionBackendFailure.Kind.UNCONFIRMED, null))
        .when(backend)
        .admit(any());
    when(backend.cycle(any())).thenThrow(new CollectionBackendFailure(readFailure, null));

    // When
    tasks.get(2).run();
    tasks.get(2).run();

    // Then: neither an unavailable read nor a missing-cycle response authorizes a fresh UUID.
    org.mockito.ArgumentCaptor<CollectionBackend.StartCycle> admission =
        org.mockito.ArgumentCaptor.forClass(CollectionBackend.StartCycle.class);
    verify(backend).admit(admission.capture());
    verify(backend).cycle(admission.getValue().cycleId());
    assertThat(admission.getValue().controlId()).isEqualTo(validation ? null : CONTROL);
    assertThat(admission.getValue().sourceBindingId()).isEqualTo(validation ? CONTROL : null);
    verifyNoInteractions(passages, qualification);
  }

  @Test
  @DisplayName(
      "Competition ticks admit fresh configuration and skip an overrun until the next ordinary tick")
  void admitsCurrentRevisionAfterRunningWork() {
    // Given
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(0, null));
    when(backend.register(0, lifecycle.getIncarnationId()))
        .thenReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()));
    lifecycle.start();
    when(backend.admit(any())).thenAnswer(call -> runningCycle(call.getArgument(0)));
    AcquisitionScheduler scheduler =
        new AcquisitionScheduler(
            timer, new SyncTaskExecutor(), lifecycle, discovery, passages, qualification);
    scheduler.start();
    org.mockito.ArgumentCaptor<Runnable> scheduled =
        org.mockito.ArgumentCaptor.forClass(Runnable.class);
    verify(timer, times(3)).schedule(scheduled.capture(), any(Trigger.class));
    List<Runnable> tasks = scheduled.getAllValues();
    CollectionBackend.ControlWork running =
        new CollectionBackend.ControlWork(
            CONTROL,
            CollectionFamilyEnum.FFVB,
            SEASON,
            3,
            true,
            CollectionSeasonStateEnum.ACTIVE,
            null,
            null,
            REQUEST);
    CollectionBackend.ControlWork eligible =
        new CollectionBackend.ControlWork(
            CONTROL,
            CollectionFamilyEnum.FFVB,
            SEASON,
            4,
            true,
            CollectionSeasonStateEnum.ACTIVE,
            null,
            null,
            null);
    when(backend.work(lifecycle.getIncarnationId()))
        .thenReturn(
            new CollectionBackend.Work(List.of(running), List.of()),
            new CollectionBackend.Work(List.of(eligible), List.of()));
    // When
    tasks.get(1).run();
    tasks.get(1).run();

    // Then
    verify(backend)
        .admit(
            org.mockito.ArgumentMatchers.argThat(
                command -> command.controlId().equals(CONTROL) && command.revision() == 4));
    verify(passages).execute(any());
    verifyNoInteractions(discovery, qualification);
  }

  @Test
  @DisplayName(
      "The minute tick admits pending, seasonless and exact candidate work, without promising a start time")
  void admitsEachEligibleMinuteScope() {
    // Given
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(0, null));
    when(backend.register(0, lifecycle.getIncarnationId()))
        .thenReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()));
    lifecycle.start();
    when(backend.admit(any())).thenAnswer(call -> runningCycle(call.getArgument(0)));
    AcquisitionScheduler scheduler =
        new AcquisitionScheduler(
            timer, new SyncTaskExecutor(), lifecycle, discovery, passages, qualification);
    scheduler.start();
    org.mockito.ArgumentCaptor<Runnable> scheduled =
        org.mockito.ArgumentCaptor.forClass(Runnable.class);
    verify(timer, times(3)).schedule(scheduled.capture(), any(Trigger.class));
    List<Runnable> tasks = scheduled.getAllValues();
    UUID clubs = UUID.fromString("00000000-0000-4000-8000-000000000001");
    UUID source = UUID.fromString("00000000-0000-4000-8000-000000000186");
    when(backend.work(lifecycle.getIncarnationId()))
        .thenReturn(
            new CollectionBackend.Work(
                List.of(
                    new CollectionBackend.ControlWork(
                        CONTROL,
                        CollectionFamilyEnum.FFVB,
                        SEASON,
                        2,
                        true,
                        CollectionSeasonStateEnum.ACTIVE,
                        REQUEST,
                        CollectionModeEnum.MANUAL,
                        null),
                    new CollectionBackend.ControlWork(
                        clubs,
                        CollectionFamilyEnum.CLUB_SHEETS,
                        null,
                        0,
                        true,
                        null,
                        null,
                        null,
                        null)),
                List.of(new CollectionBackend.ValidationWork(source, 7))));
    // When
    tasks.get(2).run();
    // Then
    verify(backend, times(3)).admit(any());
    verify(passages, times(2)).execute(any());
    verify(qualification).execute(any());
    verify(backend)
        .admit(
            org.mockito.ArgumentMatchers.argThat(
                command -> source.equals(command.sourceBindingId()) && command.revision() == 7));
    verify(backend)
        .admit(
            org.mockito.ArgumentMatchers.argThat(command -> REQUEST.equals(command.requestId())));
  }

  @Test
  @DisplayName("Unavailable current work never starts supplier work or registers again")
  void rejectsUnconfirmedWork() {
    // Given
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(0, null));
    when(backend.register(0, lifecycle.getIncarnationId()))
        .thenReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()));
    lifecycle.start();
    AcquisitionScheduler scheduler =
        new AcquisitionScheduler(
            timer, new SyncTaskExecutor(), lifecycle, discovery, passages, qualification);
    scheduler.start();
    org.mockito.ArgumentCaptor<Runnable> scheduled =
        org.mockito.ArgumentCaptor.forClass(Runnable.class);
    verify(timer, times(3)).schedule(scheduled.capture(), any(Trigger.class));
    List<Runnable> tasks = scheduled.getAllValues();
    when(backend.work(lifecycle.getIncarnationId()))
        .thenThrow(new CollectionBackendFailure(CollectionBackendFailure.Kind.UNCONFIRMED, null));
    // When
    tasks.get(1).run();
    // Then
    verify(backend, never()).admit(any());
    verify(backend).register(0, lifecycle.getIncarnationId());
    verifyNoInteractions(passages, qualification, discovery);
  }

  @Test
  @DisplayName(
      "A lost completion response and failed confirmation block later automatic admission of that control")
  void retainsUnconfirmedTerminalScope() {
    // Given
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(0, null));
    when(backend.register(0, lifecycle.getIncarnationId()))
        .thenReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()));
    lifecycle.start();
    when(backend.admit(any())).thenAnswer(call -> runningCycle(call.getArgument(0)));
    AcquisitionScheduler scheduler =
        new AcquisitionScheduler(
            timer, new SyncTaskExecutor(), lifecycle, discovery, passages, qualification);
    scheduler.start();
    org.mockito.ArgumentCaptor<Runnable> scheduled =
        org.mockito.ArgumentCaptor.forClass(Runnable.class);
    verify(timer, times(3)).schedule(scheduled.capture(), any(Trigger.class));
    List<Runnable> tasks = scheduled.getAllValues();
    CollectionBackend.ControlWork before =
        new CollectionBackend.ControlWork(
            CONTROL,
            CollectionFamilyEnum.FFVB,
            SEASON,
            0,
            true,
            CollectionSeasonStateEnum.ACTIVE,
            null,
            null,
            null);
    CollectionBackend.ControlWork completed =
        new CollectionBackend.ControlWork(
            CONTROL,
            CollectionFamilyEnum.FFVB,
            SEASON,
            1,
            true,
            CollectionSeasonStateEnum.ACTIVE,
            null,
            null,
            null);
    when(backend.work(lifecycle.getIncarnationId()))
        .thenReturn(
            new CollectionBackend.Work(List.of(before), List.of()),
            new CollectionBackend.Work(List.of(completed), List.of()));
    AtomicBoolean acceptedCompletion = new AtomicBoolean();
    when(backend.complete(any(), any()))
        .thenAnswer(
            call -> {
              acceptedCompletion.set(true);
              throw new CollectionBackendFailure(CollectionBackendFailure.Kind.UNCONFIRMED, null);
            });
    when(backend.cycle(any()))
        .thenThrow(new CollectionBackendFailure(CollectionBackendFailure.Kind.UNCONFIRMED, null));
    when(passages.execute(any()))
        .thenAnswer(
            call -> lifecycle.complete(call.getArgument(0), Instant.parse("2026-10-24T10:00:00Z")));

    // When
    tasks.get(1).run();
    tasks.get(1).run();

    // Then: no new admission can discard the original retained cycle after the peer recovers.
    assertThat(acceptedCompletion).isTrue();
    verify(backend).admit(any());
    verify(backend).complete(any(), any());
    verify(backend).cycle(any());
    verify(passages).execute(any());
    assertThat(lifecycle.isActive()).isTrue();
  }

  @Test
  @DisplayName("Unconfirmed control ownership leaves other controls eligible on later ticks")
  void isolatesUnconfirmedScope() {
    // Given
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(0, null));
    when(backend.register(0, lifecycle.getIncarnationId()))
        .thenReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()));
    lifecycle.start();
    when(backend.admit(any())).thenAnswer(call -> runningCycle(call.getArgument(0)));
    UUID other = UUID.fromString("00000000-0000-4000-8000-000000000187");
    AcquisitionScheduler scheduler =
        new AcquisitionScheduler(
            timer, new SyncTaskExecutor(), lifecycle, discovery, passages, qualification);
    scheduler.start();
    org.mockito.ArgumentCaptor<Runnable> scheduled =
        org.mockito.ArgumentCaptor.forClass(Runnable.class);
    verify(timer, times(3)).schedule(scheduled.capture(), any(Trigger.class));
    List<Runnable> tasks = scheduled.getAllValues();
    when(backend.work(lifecycle.getIncarnationId()))
        .thenReturn(
            new CollectionBackend.Work(
                List.of(
                    new CollectionBackend.ControlWork(
                        CONTROL,
                        CollectionFamilyEnum.FFVB,
                        SEASON,
                        0,
                        true,
                        CollectionSeasonStateEnum.ACTIVE,
                        null,
                        null,
                        null),
                    new CollectionBackend.ControlWork(
                        other,
                        CollectionFamilyEnum.LNV,
                        SEASON,
                        0,
                        true,
                        CollectionSeasonStateEnum.ACTIVE,
                        null,
                        null,
                        null)),
                List.of()));
    when(passages.execute(any()))
        .thenAnswer(
            call -> {
              CollectorLifecycle.AdmittedCycle context = call.getArgument(0);
              return other.equals(context.getCycle().controlId());
            });

    // When
    tasks.get(1).run();
    tasks.get(1).run();

    // Then
    verify(backend)
        .admit(
            org.mockito.ArgumentMatchers.argThat(command -> CONTROL.equals(command.controlId())));
    verify(backend, times(2))
        .admit(org.mockito.ArgumentMatchers.argThat(command -> other.equals(command.controlId())));
  }

  @Test
  @DisplayName(
      "Local ownership covers an in-progress confirmation and releases after confirmed completion")
  void holdsUntilConfirmed() {
    // Given
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(0, null));
    when(backend.register(0, lifecycle.getIncarnationId()))
        .thenReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()));
    lifecycle.start();
    when(backend.admit(any())).thenAnswer(call -> runningCycle(call.getArgument(0)));
    AcquisitionScheduler scheduler =
        new AcquisitionScheduler(
            timer, new SyncTaskExecutor(), lifecycle, discovery, passages, qualification);
    scheduler.start();
    org.mockito.ArgumentCaptor<Runnable> scheduled =
        org.mockito.ArgumentCaptor.forClass(Runnable.class);
    verify(timer, times(3)).schedule(scheduled.capture(), any(Trigger.class));
    List<Runnable> tasks = scheduled.getAllValues();
    when(backend.work(lifecycle.getIncarnationId()))
        .thenReturn(
            new CollectionBackend.Work(
                List.of(
                    new CollectionBackend.ControlWork(
                        CONTROL,
                        CollectionFamilyEnum.FFVB,
                        SEASON,
                        0,
                        true,
                        CollectionSeasonStateEnum.ACTIVE,
                        null,
                        null,
                        null)),
                List.of()));
    AtomicBoolean nestedTick = new AtomicBoolean();
    when(passages.execute(any()))
        .thenAnswer(
            call -> {
              // Simulate the backend already projecting COMPLETED while its response is being
              // confirmed.
              if (nestedTick.compareAndSet(false, true)) tasks.get(1).run();
              return true;
            });

    // When
    tasks.get(1).run();

    // Then: the overlapping opportunity cannot admit a second cycle.
    verify(backend).admit(any());

    // When a later ordinary tick follows confirmed completion, it is eligible again.
    tasks.get(1).run();
    verify(backend, times(2)).admit(any());
  }

  /**
   * Correlates an accepted backend response to the generated request identity.
   *
   * @param command explicit control or candidate request
   * @return running context without installing collaborators or starting the lifecycle
   */
  private static CollectionBackend.Cycle runningCycle(CollectionBackend.StartCycle command) {
    boolean candidate = command.sourceBindingId() != null;
    return new CollectionBackend.Cycle(
        command.cycleId(),
        command.incarnationId(),
        command.controlId(),
        command.sourceBindingId(),
        1,
        candidate ? null : CollectionModeEnum.PERIODIC,
        CollectionCycleStateEnum.RUNNING,
        candidate
            ? new CollectionBackend.Candidate(
                URI.create("https://lnv-web.dataproject.com/CompetitionHome.aspx?ID=901"),
                "2026/2027",
                CollectionProviderEnum.LNV,
                "901")
            : null,
        null);
  }

  @Test
  @DisplayName("Discovery is independent of seasons and lenient triggers skip overrun firings")
  void skipsOverrunFirings() {
    // Given
    CollectorLifecycle lifecycle = mock(CollectorLifecycle.class);
    when(lifecycle.isActive()).thenReturn(true);
    DiscoverSeasonSources discovery = mock(DiscoverSeasonSources.class);
    TaskScheduler timer = mock(TaskScheduler.class);
    AcquisitionScheduler scheduler =
        new AcquisitionScheduler(
            timer,
            new SyncTaskExecutor(),
            lifecycle,
            discovery,
            mock(CollectPassage.class),
            mock(QualifySource.class));
    Instant now = Instant.parse("2026-10-24T10:00:00Z");
    SimpleTriggerContext context = new SimpleTriggerContext(Clock.fixed(now, ZoneOffset.UTC));
    org.mockito.ArgumentCaptor<Trigger> triggers =
        org.mockito.ArgumentCaptor.forClass(Trigger.class);
    org.mockito.ArgumentCaptor<Runnable> scheduled =
        org.mockito.ArgumentCaptor.forClass(Runnable.class);

    // When
    scheduler.start();
    verify(timer, times(3)).schedule(scheduled.capture(), triggers.capture());
    scheduled.getAllValues().getFirst().run();
    List<Instant> initial =
        triggers.getAllValues().stream().map(trigger -> trigger.nextExecution(context)).toList();
    context.update(now, now, Instant.parse("2026-10-24T10:40:01Z"));
    List<Instant> afterOverrun =
        triggers.getAllValues().stream().map(trigger -> trigger.nextExecution(context)).toList();

    // Then
    verify(discovery).currentEntries();
    assertThat(initial)
        .containsExactly(
            Instant.parse("2026-10-24T10:30:00Z"),
            Instant.parse("2026-10-24T10:05:00Z"),
            Instant.parse("2026-10-24T10:01:00Z"));
    assertThat(afterOverrun)
        .containsExactly(
            Instant.parse("2026-10-24T11:00:00Z"),
            Instant.parse("2026-10-24T10:45:00Z"),
            Instant.parse("2026-10-24T10:41:00Z"));
  }
}
