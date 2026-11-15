package com.blockout.backend.search.infrastructure;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.blockout.backend.search.application.ProjectSearch;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
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
}
