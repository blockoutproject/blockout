package com.blockout.backend.search.infrastructure;

import com.blockout.backend.search.application.SearchProjection;
import com.blockout.backend.search.application.SearchProjectionBulkException;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Changed;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicLong;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/** In-memory handoff and ordinary catch-up; every task executes on the same scheduler thread. */
@Slf4j
public class SearchProjectionScheduler {
  private final SearchProjection projection;
  private final ThreadPoolTaskScheduler tasks;
  private final SearchProjectionProperties properties;
  private final MeterRegistry registry;
  private final AtomicLong lastSuccess = new AtomicLong();

  /**
   * Registers truthful latest-complete-generation evidence, zero until this process succeeds.
   *
   * @param projection current owner rereads and external writes
   * @param tasks dedicated one-thread scheduler
   * @param properties regular rebuild delay
   * @param registry existing F13 metric registry
   */
  public SearchProjectionScheduler(
      SearchProjection projection,
      ThreadPoolTaskScheduler tasks,
      SearchProjectionProperties properties,
      MeterRegistry registry) {
    this.projection = projection;
    this.tasks = tasks;
    this.properties = properties;
    this.registry = registry;
    Gauge.builder("search.projection.last.success.time", lastSuccess, AtomicLong::doubleValue)
        .baseUnit("seconds")
        .description("Latest confirmed complete search generation; zero before success")
        .register(registry);
  }

  /**
   * Starts immediately, with delay measured from each full run's actual completion.
   *
   * @param event serving application readiness
   */
  @EventListener
  public void start(ApplicationReadyEvent event) {
    tasks.scheduleWithFixedDelay(this::rebuild, properties.fullRebuildDelay());
  }

  /**
   * Submits identities only; rejection is diagnosed without failing the committed SQL operation.
   *
   * @param changed already committed F02 scopes
   */
  @EventListener
  public void submit(Changed changed) {
    try {
      tasks.execute(
          () ->
              run("targeted", () -> projection.update(changed.scopes()), changed.scopes().size()));
    } catch (RuntimeException failure) {
      failure("submission", changed.scopes().size(), failure);
    }
  }

  /** Performs one regular full run; failed work waits for the next ordinary full run. */
  public void rebuild() {
    run(
        "rebuild",
        () -> {
          projection.rebuild();
          lastSuccess.set(Instant.now().getEpochSecond());
        },
        0);
  }

  /**
   * Owns one terminal task diagnostic without exposing raw dependency messages or throwable data.
   *
   * @param stage bounded targeted or rebuild stage
   * @param operation current projection operation
   * @param count submitted scope count, zero for full traversal
   */
  private void run(String stage, Runnable operation, int count) {
    try {
      operation.run();
      registry.counter("search.projection.runs", "action", stage, "outcome", "success").increment();
      log.atInfo()
          .addKeyValue("operation", "search_projection")
          .addKeyValue("stage", stage)
          .addKeyValue("outcome", "success")
          .addKeyValue("affected_count", count)
          .addKeyValue("last_success_at", lastSuccess.get())
          .log("Search projection completed");
    } catch (RuntimeException failure) {
      failure(stage, count, failure);
    }
  }

  /**
   * Records an absorbed failure using safe bounded fields and the existing registry.
   *
   * @param stage bounded operation stage
   * @param count submitted scope count
   * @param failure exception used only for its type
   */
  private void failure(String stage, int count, RuntimeException failure) {
    registry.counter("search.projection.runs", "action", stage, "outcome", "failed").increment();
    log.atError()
        .addKeyValue("operation", "search_projection")
        .addKeyValue("stage", stage)
        .addKeyValue("outcome", "failed")
        .addKeyValue(
            "affected_count",
            failure instanceof SearchProjectionBulkException bulk ? bulk.getAttempted() : count)
        .addKeyValue(
            "partial_count",
            failure instanceof SearchProjectionBulkException bulk ? bulk.getSucceeded() : 0)
        .addKeyValue("last_success_at", lastSuccess.get())
        .addKeyValue("reason", failure.getClass().getSimpleName())
        .log("Search projection failed; next full run supplies catch-up");
  }
}
