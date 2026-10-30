package com.blockout.collector.acquisition.application;

import com.blockout.collector.generated.ingestion.model.CollectionCycleStateEnum;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * One startup incarnation, acknowledged admission and pre-read ordinals; no restart/replay loop.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CollectorLifecycle {
  private static final long MAX_SAFE_INTEGER = 9_007_199_254_740_991L;
  private final CollectionBackend backend;
  @Getter private final UUID incarnationId = UUID.randomUUID();
  private boolean registrationAttempted;
  @Getter private volatile boolean active;

  /**
   * Reads then conditionally registers once. Failure ends startup without confirming or replaying
   * registration; an operator may explicitly restart the process.
   */
  public synchronized void start() {
    if (registrationAttempted)
      throw new IllegalStateException("Collector startup was already attempted");
    registrationAttempted = true;
    CollectionBackend.Runtime current = backend.current();
    CollectionBackend.Runtime registered = backend.register(current.revision(), incarnationId);
    if (!incarnationId.equals(registered.incarnationId()))
      throw new IllegalStateException("Collector startup is not current");
    active = true;
  }

  /**
   * Reads fresh work for this startup, inspecting a conflicting runtime once without registration.
   *
   * @return current backend intent; no remembered configuration authorizes provider work
   * @throws CollectionBackendFailure when the read is refused or unavailable
   */
  public CollectionBackend.Work work() {
    requireActive();
    try {
      return backend.work(incarnationId);
    } catch (CollectionBackendFailure failure) {
      inspectConflict(failure);
      throw failure;
    }
  }

  /**
   * Allocates one cycle UUID and attempts admission once. Only its successful response permits
   * provider reads; a failed attempt ends and the next ordinary poll reads backend eligibility.
   *
   * @param controlId selected control, absent for validation
   * @param sourceBindingId selected candidate, absent for collection
   * @param revision current control/candidate revision
   * @param requestId exact pending intent, otherwise absent
   * @return runnable current capability, never an unconfirmed admission
   */
  public AdmittedCycle admit(UUID controlId, UUID sourceBindingId, long revision, UUID requestId) {
    requireActive();
    if ((controlId == null) == (sourceBindingId == null))
      throw new IllegalArgumentException("Exactly one collection purpose is required");
    CollectionBackend.StartCycle command =
        new CollectionBackend.StartCycle(
            UUID.randomUUID(), incarnationId, controlId, sourceBindingId, revision, requestId);
    CollectionBackend.Cycle cycle;
    try {
      cycle = backend.admit(command);
    } catch (CollectionBackendFailure failure) {
      inspectConflict(failure);
      throw failure;
    }
    if (!incarnationId.equals(cycle.incarnationId())
        || cycle.state() == CollectionCycleStateEnum.INTERRUPTED) stop();
    requireActive();
    if (!cycle.id().equals(command.cycleId())
        || !Objects.equals(cycle.controlId(), controlId)
        || !Objects.equals(cycle.sourceBindingId(), sourceBindingId)
        || cycle.state() != CollectionCycleStateEnum.RUNNING
        || (controlId != null && (cycle.mode() == null || cycle.candidate() != null))
        || (sourceBindingId != null && (cycle.mode() != null || cycle.candidate() == null))) {
      throw new IllegalStateException("Backend did not confirm the requested runnable context");
    }
    return new AdmittedCycle(cycle);
  }

  /**
   * Stops a superseded startup after one current-runtime read, preserving the original refusal.
   *
   * @param failure original work, admission or execution failure; only conflicts need inspection
   */
  public void inspectConflict(CollectionBackendFailure failure) {
    if (failure.getKind() != CollectionBackendFailure.Kind.CONFLICT) return;
    try {
      if (!incarnationId.equals(backend.current().incarnationId())) stop();
    } catch (CollectionBackendFailure unavailable) {
      log.atWarn()
          .addKeyValue("operation", "collector_runtime")
          .addKeyValue("outcome", "unconfirmed")
          .log("Runtime could not be confirmed; the original refusal remains definitive");
    }
  }

  /** Stops new reads/admission after supersession; no automatic re-registration is possible. */
  public void stop() {
    active = false;
    log.atWarn()
        .addKeyValue("operation", "collector_runtime")
        .addKeyValue("outcome", "stopped")
        .log("Collector incarnation is no longer current; restart requires operator action");
  }

  /**
   * Sends normal completion once; failure remains an ordinary backend error.
   *
   * @param context original admitted control capability
   * @param completedAt actual passage end
   */
  public void complete(AdmittedCycle context, Instant completedAt) {
    if (context.getCycle().controlId() == null)
      throw new IllegalArgumentException("Control completion requires a control passage");
    backend.complete(context.getCycle().id(), completedAt);
  }

  /**
   * Publishes candidate evidence once, independently of control completion.
   *
   * @param context original admitted candidate capability
   * @param result interpretation owned by source qualification
   */
  public void validate(AdmittedCycle context, CollectionBackend.Validation result) {
    if (context.getCycle().sourceBindingId() == null
        || !context.getCycle().id().equals(result.cycleId()))
      throw new IllegalArgumentException("Candidate result requires its admitted context");
    try {
      backend.validate(context.getCycle().sourceBindingId(), result);
    } catch (CollectionBackendFailure failure) {
      inspectConflict(failure);
      throw failure;
    }
  }

  /** Refuses work before startup confirmation or after supersession. */
  void requireActive() {
    if (!active) throw new IllegalStateException("Collector is not active");
  }

  /** One confirmed context owns its monotonic pre-read ordinal, not observation arrival time. */
  @Getter
  public final class AdmittedCycle {
    private final CollectionBackend.Cycle cycle;

    @Getter(AccessLevel.NONE)
    private final AtomicLong ordinal = new AtomicLong();

    /**
     * Creates a capability only from a confirmed running context.
     *
     * @param cycle current backend-confirmed purpose
     */
    private AdmittedCycle(CollectionBackend.Cycle cycle) {
      this.cycle = cycle;
    }

    /**
     * Allocates the next safe ordinal immediately before a provider read.
     *
     * @return next safe logical ordinal, allocated immediately before a provider read
     */
    public long nextReadOrdinal() {
      requireActive();
      return ordinal.updateAndGet(
          value -> {
            if (value >= MAX_SAFE_INTEGER)
              throw new IllegalStateException("Collection read ordinal is exhausted");
            return value + 1;
          });
    }
  }
}
