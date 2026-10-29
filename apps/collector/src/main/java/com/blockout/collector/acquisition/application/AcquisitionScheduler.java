package com.blockout.collector.acquisition.application;

import com.blockout.collector.generated.ingestion.model.CollectionModeEnum;
import com.blockout.collector.generated.ingestion.model.CollectionSeasonStateEnum;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
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
  private final CollectorLifecycle lifecycle;
  private final DiscoverSeasonSources discovery;
  private final CollectPassage passages;
  private final QualifySource qualification;
  // Local admission/acknowledgement ownership, which backend projections cannot establish.
  private final Set<Scope> heldScopes = ConcurrentHashMap.newKeySet();

  /** One control or candidate identity, independent of a later revision or request. */
  private record Scope(UUID controlId, UUID sourceBindingId) {}

  /**
   * Wires managed native scheduling and bounded execution, without starting provider work.
   *
   * @param timer lenient scheduling clock
   * @param executor bounded passage executor with no pending queue
   * @param lifecycle once-registered startup and uncertainty policy
   * @param discovery current entry discovery independent of seasons
   * @param passages existing admitted passage implementation
   * @param qualification exact admitted candidate qualification
   */
  public AcquisitionScheduler(
      TaskScheduler timer,
      @Qualifier("acquisitionExecutor") TaskExecutor executor,
      CollectorLifecycle lifecycle,
      DiscoverSeasonSources discovery,
      CollectPassage passages,
      QualifySource qualification) {
    this.timer = timer;
    this.executor = executor;
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
    CollectionBackend.Work work = lifecycle.work();
    if (requests) {
      for (CollectionBackend.ValidationWork candidate : work.validations()) {
        schedule(new Scope(null, candidate.sourceBindingId()), candidate.revision(), null);
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
      schedule(new Scope(control.id(), null), control.revision(), control.requestId());
    }
  }

  /**
   * Claims an opportunity before asynchronous admission; native saturation releases it immediately.
   *
   * @param scope exact independent control or candidate
   * @param revision fresh configuration revision
   * @param requestId pending control intent, absent for periodic work or validation
   */
  private void schedule(Scope scope, long revision, UUID requestId) {
    if (!heldScopes.add(scope)) return;
    if (!submit(() -> execute(scope, revision, requestId))) heldScopes.remove(scope);
  }

  /**
   * Retains ownership from admission through terminal confirmation, including uncertain admission.
   * Only a definite admission refusal or confirmed terminal result releases it. Current-work and
   * COMPLETED projections cannot prove receipt of the original acknowledgement. Other scopes remain
   * eligible; unresolved scopes require inspection and explicit process restart.
   *
   * @param scope identity already claimed locally
   * @param revision configuration revision used by this single admission attempt
   * @param requestId exact pending control intent, otherwise absent
   */
  private void execute(Scope scope, long revision, UUID requestId) {
    CollectorLifecycle.AdmittedCycle context;
    try {
      context = lifecycle.admit(scope.controlId(), scope.sourceBindingId(), revision, requestId);
    } catch (CollectionBackendFailure failure) {
      if (failure.getKind() != CollectionBackendFailure.Kind.UNCONFIRMED) heldScopes.remove(scope);
      throw failure;
    }
    boolean confirmed =
        scope.sourceBindingId() == null
            ? passages.execute(context)
            : qualification.execute(context);
    if (confirmed) heldScopes.remove(scope);
  }

  /**
   * Rejects saturated work before admission; the next ordinary tick reads current intent again.
   *
   * @param work one admission and passage, never retained in a queue on saturation
   * @return whether the native executor accepted the opportunity
   */
  private boolean submit(Runnable work) {
    try {
      executor.execute(() -> safely(work));
      return true;
    } catch (TaskRejectedException saturated) {
      log.atWarn()
          .addKeyValue("operation", "collection_schedule")
          .addKeyValue("outcome", "saturated")
          .log("Acquisition capacity is full; this opportunity was skipped");
      return false;
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
