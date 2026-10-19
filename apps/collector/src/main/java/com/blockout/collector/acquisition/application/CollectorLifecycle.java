package com.blockout.collector.acquisition.application;

import com.blockout.collector.generated.ingestion.model.CollectionCycleStateEnum;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * One startup incarnation, read-confirmed admission and pre-read ordinals; no restart/replay loop.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CollectorLifecycle {
  private static final long MAX_SAFE_INTEGER = 9_007_199_254_740_991L;
  private final CollectionBackend backend;
  @Getter private final UUID incarnationId = UUID.randomUUID();
  private boolean registrationAttempted;
  private volatile boolean active;

  /**
   * Reads then conditionally registers once; an uncertain acknowledgement is confirmed by a read. A
   * superseded or unconfirmed startup fails without another registration attempt.
   */
  public synchronized void start() {
    if (registrationAttempted)
      throw new IllegalStateException("Collector startup was already attempted");
    registrationAttempted = true;
    CollectionBackend.Runtime current = backend.current();
    CollectionBackend.Runtime registered;
    try {
      registered = backend.register(current.revision(), incarnationId);
    } catch (CollectionBackendFailure failure) {
      if (failure.getKind() != CollectionBackendFailure.Kind.UNCONFIRMED) throw failure;
      registered = backend.current();
    }
    if (!incarnationId.equals(registered.incarnationId()))
      throw new IllegalStateException("Collector startup is not current");
    active = true;
  }

  /**
   * Allocates one cycle UUID, attempts admission once and reads that exact cycle after uncertainty.
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
      if (failure.getKind() == CollectionBackendFailure.Kind.CONFLICT) {
        if (!incarnationId.equals(backend.current().incarnationId())) stop();
        throw failure;
      }
      if (failure.getKind() != CollectionBackendFailure.Kind.UNCONFIRMED) throw failure;
      cycle = backend.cycle(command.cycleId());
    }
    if (!incarnationId.equals(cycle.incarnationId())
        || cycle.state() == CollectionCycleStateEnum.INTERRUPTED) stop();
    requireActive();
    if (!cycle.id().equals(command.cycleId())
        || !Objects.equals(cycle.controlId(), controlId)
        || !Objects.equals(cycle.sourceBindingId(), sourceBindingId)
        || cycle.state() != CollectionCycleStateEnum.RUNNING
        || (controlId != null && (cycle.mode() == null || cycle.hasCandidate()))
        || (sourceBindingId != null && (cycle.mode() != null || !cycle.hasCandidate()))) {
      throw new IllegalStateException("Backend did not confirm the requested runnable context");
    }
    return new AdmittedCycle(cycle);
  }

  /** Stops new reads/admission after supersession; no automatic re-registration is possible. */
  public void stop() {
    active = false;
    log.atWarn()
        .addKeyValue("operation", "collector_runtime")
        .addKeyValue("outcome", "stopped")
        .log("Collector incarnation is no longer current; restart requires operator action");
  }

  /** Refuses work before startup confirmation or after supersession. */
  private void requireActive() {
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
