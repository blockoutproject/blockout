package com.blockout.backend.sporting.application;

import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Transaction-bound identity handoff; F04 owns scheduling, rebuild and lost-request recovery. */
@Component
@RequiredArgsConstructor
@Slf4j
public class SportingProjectionChanges {
  private final ApplicationEventPublisher events;

  /** Sporting scopes whose current dependents can be resolved through the owner read API. */
  public enum Kind {
    CLUB,
    TEAM,
    POOL,
    DIVISION,
    SEASON
  }

  /** Stable owner identity only; no copied public or private values. */
  public record Scope(Kind kind, UUID id) {}

  /** After-commit request. Consumers enqueue bounded work and read current owner inputs later. */
  public record Changed(Set<Scope> scopes) {
    /**
     * Freezes identities at the mutation boundary.
     *
     * @param scopes affected identities or owning scopes
     */
    public Changed {
      scopes = Set.copyOf(scopes);
    }
  }

  /** Internal transaction event; consumers subscribe to Changed instead. */
  private record Pending(Changed change) {}

  /**
   * Registers one scope within the mutation transaction for delivery only after commit. No durable
   * queue or replay is retained; callers without a transaction are rejected before registration.
   *
   * @param kind affected sporting owner kind
   * @param id existing or newly persisted stable identity
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public void submit(Kind kind, UUID id) {
    events.publishEvent(new Pending(new Changed(Set.of(new Scope(kind, id)))));
  }

  /**
   * Publishes committed identities without turning a downstream scheduling failure into a failed
   * sporting response. F04's ordinary rebuild supplies catch-up after loss.
   *
   * @param pending transaction-bound identity request
   */
  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void afterCommit(Pending pending) {
    try {
      events.publishEvent(pending.change());
    } catch (RuntimeException failure) {
      log.atWarn()
          .addKeyValue("operation", "sporting_projection_handoff")
          .addKeyValue("reason", failure.getClass().getSimpleName())
          .log("Committed sporting change could not reach projection scheduling");
    }
  }
}
