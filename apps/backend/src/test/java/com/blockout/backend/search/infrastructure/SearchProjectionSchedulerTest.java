package com.blockout.backend.search.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.search.application.ProjectSearch;
import com.blockout.backend.sporting.application.SportingProjectionChanges;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Changed;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Scope;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.Duration;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/** Direct scheduling adapter decisions; actual Spring wiring has its own integration suite. */
@DisplayName("Search projection scheduling")
class SearchProjectionSchedulerTest {
  private final ProjectSearch projection = mock(ProjectSearch.class);
  private final ThreadPoolTaskScheduler tasks = mock(ThreadPoolTaskScheduler.class);
  private final SimpleMeterRegistry metrics = new SimpleMeterRegistry();
  private final SearchProjectionScheduler scheduler =
      new SearchProjectionScheduler(
          projection, tasks, new SearchProjectionProperties(Duration.ofHours(1)), metrics);

  @Test
  @DisplayName("Schedules immediate full builds with the configured completion-based delay")
  void schedulesFullBuilds() {
    // Given
    Duration delay = Duration.ofHours(1);

    // When
    scheduler.start(null);

    // Then
    verify(tasks).scheduleWithFixedDelay(any(Runnable.class), eq(delay));
    verifyNoInteractions(projection);
  }

  @Test
  @DisplayName("Defers current owner reads until the submitted task executes")
  void defersOwnerReads() {
    // Given
    Changed change =
        new Changed(
            Set.of(
                new Scope(
                    SportingProjectionChanges.Kind.CLUB,
                    UUID.fromString("00000000-0000-4000-8000-000000000001"))));

    // When
    scheduler.submit(change);

    // Then
    verify(tasks).execute(any(Runnable.class));
    verifyNoInteractions(projection);
  }

  @Test
  @DisplayName("Projects the exact committed scopes when the submitted task executes")
  void projectsCommittedScopes() {
    // Given
    Changed change =
        new Changed(
            Set.of(
                new Scope(
                    SportingProjectionChanges.Kind.CLUB,
                    UUID.fromString("00000000-0000-4000-8000-000000000001"))));
    ArgumentCaptor<Runnable> submitted = ArgumentCaptor.forClass(Runnable.class);
    doNothing().when(tasks).execute(submitted.capture());
    scheduler.submit(change);

    // When
    submitted.getValue().run();

    // Then
    verify(projection).update(change.scopes());
    assertThat(
            metrics
                .get("search.projection.runs")
                .tags("action", "targeted", "outcome", "success")
                .counter()
                .count())
        .isEqualTo(1);
  }

  @Test
  @DisplayName("Rebuilds the complete projection when the scheduled task executes")
  void executesScheduledRebuild() {
    // Given
    ArgumentCaptor<Runnable> scheduled = ArgumentCaptor.forClass(Runnable.class);
    when(tasks.scheduleWithFixedDelay(scheduled.capture(), eq(Duration.ofHours(1))))
        .thenReturn(null);
    scheduler.start(null);

    // When
    scheduled.getValue().run();

    // Then
    verify(projection).rebuild();
    assertThat(
            metrics
                .get("search.projection.runs")
                .tags("action", "rebuild", "outcome", "success")
                .counter()
                .count())
        .isEqualTo(1);
  }
}
