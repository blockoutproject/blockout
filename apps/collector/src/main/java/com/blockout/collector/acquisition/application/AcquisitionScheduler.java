package com.blockout.collector.acquisition.application;

import com.blockout.collector.generated.ingestion.model.CollectionModeEnum;
import com.blockout.collector.generated.ingestion.model.CollectionSeasonStateEnum;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskExecutor;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.stereotype.Component;

/** Native skip-on-overrun ticks; the backend alone admits and freezes due targets. */
@Component
@Slf4j
public class AcquisitionScheduler {
  private final TaskScheduler timer;
  private final TaskExecutor executor;
  private final CollectionBackend backend;
  private final CollectorLifecycle lifecycle;
  private final DiscoverSeasonSources discovery;
  private final CollectPassage passages;
  private final QualifySource qualification;

  /**
   * Wires managed native scheduling and bounded execution, without starting provider work.
   *
   * @param timer lenient scheduling clock
   * @param executor bounded passage executor with no pending queue
   * @param backend current intent and admission authority
   * @param lifecycle once-registered startup and uncertainty policy
   * @param discovery current entry discovery independent of seasons
   * @param passages existing admitted passage implementation
   * @param qualification exact admitted candidate qualification
   */
  public AcquisitionScheduler(
      TaskScheduler timer,
      @Qualifier("acquisitionExecutor") TaskExecutor executor,
      CollectionBackend backend,
      CollectorLifecycle lifecycle,
      DiscoverSeasonSources discovery,
      CollectPassage passages,
      QualifySource qualification) {
    this.timer = timer;
    this.executor = executor;
    this.backend = backend;
    this.lifecycle = lifecycle;
    this.discovery = discovery;
    this.passages = passages;
    this.qualification = qualification;
  }

  /**
   * Starts only after successful startup registration; native scheduler shutdown owns cancellation.
   */
  public void start() {
    timer.schedule(
        () -> safely(discovery::currentEntries), CronTrigger.forLenientExecution("0 */30 * * * *"));
    timer.schedule(
        () -> safely(() -> poll(false)), CronTrigger.forLenientExecution("0 */5 * * * *"));
    timer.schedule(() -> safely(() -> poll(true)), CronTrigger.forLenientExecution("0 * * * * *"));
  }

  /**
   * Reads fresh intent on each tick; overrun cycles and ineligible work are skipped, never queued.
   *
   * @param requests minute tick for manual, validation and seasonless work; otherwise competition
   *     tick
   */
  private void poll(boolean requests) {
    lifecycle.requireActive();
    CollectionBackend.Work work = backend.work(lifecycle.getIncarnationId());
    if (requests) {
      for (CollectionBackend.ValidationWork candidate : work.validations()) {
        submit(
            () ->
                qualification.execute(
                    lifecycle.admit(
                        null, candidate.sourceBindingId(), candidate.revision(), null)));
      }
    }
    for (CollectionBackend.ControlWork control : work.controls()) {
      boolean initial =
          control.requestedMode() == CollectionModeEnum.INITIAL_IMPORT
              && control.requestId() != null;
      if (control.runningCycleId() != null
          || control.seasonState() == CollectionSeasonStateEnum.CLOSED
          || (!initial
              && (!control.enabled()
                  || (control.seasonId() != null
                      && control.seasonState() != CollectionSeasonStateEnum.ACTIVE)))) continue;
      boolean minuteWork = control.requestId() != null || control.seasonId() == null;
      if (minuteWork != requests) continue;
      submit(
          () ->
              passages.execute(
                  lifecycle.admit(control.id(), null, control.revision(), control.requestId())));
    }
  }

  /**
   * Rejects saturated work before admission; the next ordinary tick reads current intent again.
   *
   * @param work one admission and passage, never retained in a queue on saturation
   */
  private void submit(Runnable work) {
    try {
      executor.execute(() -> safely(work));
    } catch (TaskRejectedException saturated) {
      log.atWarn()
          .addKeyValue("operation", "collection_schedule")
          .addKeyValue("outcome", "saturated")
          .log("Acquisition capacity is full; this opportunity was skipped");
    }
  }

  /**
   * Keeps future ordinary ticks after a failed opportunity without replay or raw exception data.
   *
   * @param work one current read, admission or independently scheduled discovery
   */
  private void safely(Runnable work) {
    if (!lifecycle.isActive()) return;
    try {
      lifecycle.requireActive();
      work.run();
    } catch (CollectionBackendFailure failure) {
      if (failure.getKind() == CollectionBackendFailure.Kind.CONFLICT) {
        try {
          if (!lifecycle.getIncarnationId().equals(backend.current().incarnationId()))
            lifecycle.stop();
        } catch (CollectionBackendFailure unavailable) {
          log.atWarn()
              .addKeyValue("operation", "collection_schedule")
              .addKeyValue("outcome", "runtime_unconfirmed")
              .log("Runtime could not be confirmed; no registration was attempted");
        }
      }
      log.atWarn()
          .addKeyValue("operation", "collection_schedule")
          .addKeyValue("outcome", failure.getKind())
          .log("Acquisition opportunity failed; no mutation was replayed");
    } catch (RuntimeException failure) {
      log.atError()
          .addKeyValue("operation", "collection_schedule")
          .addKeyValue("outcome", "failed")
          .addKeyValue("exceptionType", failure.getClass().getSimpleName())
          .log("Acquisition opportunity failed; inspect current state before recovery");
    }
  }
}
