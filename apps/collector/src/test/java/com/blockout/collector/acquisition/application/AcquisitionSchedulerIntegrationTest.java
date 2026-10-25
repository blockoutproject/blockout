package com.blockout.collector.acquisition.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.collector.generated.ingestion.model.CollectionFamilyEnum;
import com.blockout.collector.generated.ingestion.model.CollectionSeasonStateEnum;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.Trigger;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/** Verifies Spring scheduling and bounded executor behavior without provider traffic. */
@DisplayName("Native acquisition scheduler integration")
class AcquisitionSchedulerIntegrationTest {
  private static final UUID SEASON = UUID.fromString("00000000-0000-4000-8000-000000000183");
  private static final UUID CONTROL = UUID.fromString("00000000-0000-4000-8000-000000000184");
  private final CollectionBackend backend = mock(CollectionBackend.class);
  private final CollectPassage passages = mock(CollectPassage.class);
  private final QualifySource qualification = mock(QualifySource.class);
  private final DiscoverSeasonSources discovery = mock(DiscoverSeasonSources.class);
  private final TaskScheduler timer = mock(TaskScheduler.class);
  private CollectorLifecycle lifecycle;

  @Test
  @DisplayName("Native executor saturation skips admission and queues no missed passage")
  void skipsSaturatedExecutor() throws Exception {
    // Given
    lifecycle = new CollectorLifecycle(backend);
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(0, null));
    when(backend.register(0, lifecycle.getIncarnationId()))
        .thenReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()));
    lifecycle.start();
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(1);
    executor.setMaxPoolSize(1);
    executor.setQueueCapacity(0);
    executor.initialize();
    CountDownLatch held = new CountDownLatch(1);
    CountDownLatch release = new CountDownLatch(1);
    try {
      executor.execute(
          () -> {
            held.countDown();
            try {
              if (!release.await(10, TimeUnit.SECONDS))
                throw new IllegalStateException("Test release timed out");
            } catch (InterruptedException failure) {
              Thread.currentThread().interrupt();
            }
          });
      assertThat(held.await(10, TimeUnit.SECONDS)).isTrue();
      AcquisitionScheduler scheduler =
          new AcquisitionScheduler(timer, executor, lifecycle, discovery, passages, qualification);
      scheduler.start();
      org.mockito.ArgumentCaptor<Runnable> scheduled =
          org.mockito.ArgumentCaptor.forClass(Runnable.class);
      verify(timer, times(3)).schedule(scheduled.capture(), any(Trigger.class));
      Runnable competitionTick = scheduled.getAllValues().get(1);
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
      // When
      competitionTick.run();
      // Then
      assertThat(executor.getQueueSize()).isZero();
      verify(backend, never()).admit(any());
      verifyNoInteractions(passages);
    } finally {
      release.countDown();
      executor.shutdown();
    }
  }
}
