package com.blockout.backend.identity.subscription.application;

import com.blockout.backend.identity.subscription.domain.*;
import com.blockout.backend.jobs.application.*;
import java.time.*;
import java.util.*;
import org.springframework.transaction.support.TransactionTemplate;

/** Owns subscription requests, local decisions and revision-checked SQL effects. */
public final class Subscriptions {
  public static final String JOB_TYPE = "identity.subscription.refresh";
  private final SubscriptionStore store;
  private final JobPublisher publisher;
  private final JobRepository jobs;
  private final TransactionTemplate tx;
  private final Clock clock;

  /**
   * Connects the owner to transaction-aware persistence and the existing durable queue.
   *
   * @param store identity-owned subscription persistence
   * @param publisher publication joining owner transactions
   * @param jobs queue lifecycle reads through its public boundary
   * @param tx short SQL transaction boundary
   * @param clock elapsed-time policy clock
   */
  public Subscriptions(
      SubscriptionStore store,
      JobPublisher publisher,
      JobRepository jobs,
      TransactionTemplate tx,
      Clock clock) {
    this.store = store;
    this.publisher = publisher;
    this.jobs = jobs;
    this.tx = tx;
    this.clock = clock;
  }

  /**
   * Consults local evidence without provider calls or writes.
   *
   * @param userId authenticated active profile owner
   * @return current evidence and refresh state
   */
  public SubscriptionView find(UUID userId) {
    Optional<SubscriptionSnapshot> snapshot = store.find(userId);
    SubscriptionEvidence proof = snapshot.map(SubscriptionSnapshot::evidence).orElse(null);
    SubscriptionDecision decision = SubscriptionPolicy.evaluate(proof, clock.instant());
    SubscriptionView.RefreshState refresh = SubscriptionView.RefreshState.IDLE;
    if (snapshot.isPresent() && snapshot.get().jobId() != null) {
      Optional<JobState> state = jobs.state(snapshot.get().jobId());
      refresh =
          state.filter(s -> s == JobState.PENDING || s == JobState.RUNNING).isPresent()
              ? SubscriptionView.RefreshState.PENDING
              : SubscriptionView.RefreshState.FAILED;
    }
    return new SubscriptionView(
        decision.state(),
        proof == null ? null : proof.verifiedAt(),
        decision.usableUntil(),
        refresh,
        proof == null ? null : proof.failure());
  }

  /**
   * Evaluates future Pro operations without transport coupling or side effects.
   *
   * @param userId authenticated active owner
   * @return allow, confirmed refusal or retryable unavailability
   */
  public ProAccess proAccess(UUID userId) {
    return switch (find(userId).state()) {
      case ACTIVE, GRACE -> ProAccess.ALLOWED;
      case INACTIVE -> ProAccess.REQUIRED;
      case UNKNOWN -> ProAccess.UNAVAILABLE;
    };
  }

  /** Owner authorization vocabulary; the HTTP adapter chooses 403 or 503 for refusals. */
  public enum ProAccess {
    ALLOWED,
    REQUIRED,
    UNAVAILABLE
  }

  /**
   * Initializes verification in the caller's profile-creation transaction.
   *
   * @param userId newly created billing owner
   */
  public void initialize(UUID userId) {
    request(userId, RefreshTrigger.AUTOMATIC);
  }

  /**
   * Accepts a user refresh, throttled per owner and coalesced with current work.
   *
   * @param userId authenticated active owner
   */
  public void refresh(UUID userId) {
    tx.executeWithoutResult(_ -> request(userId, RefreshTrigger.USER));
  }

  /**
   * Scans at most 100 missing/due owners; existing work is not multiplied.
   *
   * @return number of candidates inspected
   */
  public int reconcileDue() {
    List<UUID> due = store.due(clock.instant());
    for (UUID id : due) tx.executeWithoutResult(_ -> request(id, RefreshTrigger.PERIODIC));
    return due.size();
  }

  /**
   * Reads the revision to be verified before any provider call.
   *
   * @param userId owner encoded in the job payload
   * @return durable state, absent only for unsupported/deleted owner work
   */
  public Optional<SubscriptionSnapshot> snapshot(UUID userId) {
    return store.find(userId);
  }

  /**
   * Commits complete proof only when the captured revision is still current. Called only inside the
   * queue's fenced SQL effect.
   *
   * @param captured revision read before provider I/O
   * @param observation complete external result
   * @param verifiedAt conservative observation start instant
   */
  public void verified(
      SubscriptionSnapshot captured,
      SubscriptionObservation.Verified observation,
      Instant verifiedAt) {
    SubscriptionSnapshot current = store.lock(captured.binding().userId());
    if (current.requestedRevision() != captured.requestedRevision()) {
      successor(current);
      return;
    }
    Instant next = null;
    if (observation.positive()) {
      next = verifiedAt.plusSeconds(300);
      if (observation.periodEnd() != null
          && observation.periodEnd().isAfter(verifiedAt)
          && observation.periodEnd().isBefore(next)) next = observation.periodEnd();
    }
    store.verified(
        current.binding().userId(), current.requestedRevision(), observation, verifiedAt, next);
  }

  /**
   * Records failure atomically with retry; never extends or replaces a positive observation.
   *
   * @param captured revision read before provider I/O
   * @param failure safe provider outcome
   * @param terminal whether this attempt exhausts the current work
   */
  public void failed(
      SubscriptionSnapshot captured, SubscriptionObservation.Failed failure, boolean terminal) {
    SubscriptionSnapshot current = store.lock(captured.binding().userId());
    if (current.requestedRevision() != captured.requestedRevision()) {
      if (terminal) successor(current);
      return;
    }
    store.failed(current.binding().userId(), failure.reason(), clock.instant());
  }

  /**
   * Authenticated events publish all known owner requests with one durable receipt.
   *
   * @param id provider receipt identity
   * @param type event type
   * @param eventAt original event instant
   * @param project retained provider project
   * @param environment isolated billing namespace
   * @param customers all affected exact identifiers
   * @param outgoing transfer identifiers whose proof must be invalidated
   */
  public void webhook(
      String id,
      String type,
      Instant eventAt,
      String project,
      BillingEnvironment environment,
      Set<String> customers,
      Set<String> outgoing) {
    tx.executeWithoutResult(
        _ -> {
          if (!store.receipt(id, type, eventAt, clock.instant())) return;
          Set<UUID> invalidated = new HashSet<>(store.owners(project, environment, outgoing));
          for (UUID owner : store.owners(project, environment, customers)) {
            store.lock(owner);
            if (invalidated.contains(owner)) store.invalidate(owner);
            request(owner, RefreshTrigger.AUTOMATIC);
          }
        });
  }

  /**
   * Serializes request revisions without retaining SQL locks during provider reads.
   *
   * @param userId existing owner
   * @param trigger selects user cooldown, periodic due checks or immediate event-driven work
   */
  private void request(UUID userId, RefreshTrigger trigger) {
    SubscriptionSnapshot current = store.lock(userId);
    Instant now = clock.instant();
    if (trigger == RefreshTrigger.USER
        && current.requestedAt() != null
        && now.isBefore(current.requestedAt().plusSeconds(30))) return;
    boolean pending =
        current.jobId() != null
            && jobs.state(current.jobId())
                .filter(s -> s == JobState.PENDING || s == JobState.RUNNING)
                .isPresent();
    if (trigger == RefreshTrigger.PERIODIC && !pending && current.jobId() != null) {
      Optional<Instant> recoverAt =
          jobs.finishedAt(current.jobId()).map(instant -> instant.plusSeconds(900));
      if (recoverAt.isPresent() && now.isBefore(recoverAt.get())) {
        store.deferScan(userId, recoverAt.get());
        return;
      }
    }
    if (trigger == RefreshTrigger.PERIODIC && pending) {
      store.deferScan(userId, now.plusSeconds(300));
      return;
    }
    if (trigger == RefreshTrigger.PERIODIC
        && current.nextRefreshAt() != null
        && now.isBefore(current.nextRefreshAt())) return;
    long revision = current.requestedRevision() + 1;
    UUID jobId = pending ? current.jobId() : publish(userId);
    store.request(
        userId, revision, jobId, trigger == RefreshTrigger.USER ? now : current.requestedAt());
  }

  /** Selects only the scheduling rules that differ between existing request sources. */
  private enum RefreshTrigger {
    AUTOMATIC,
    USER,
    PERIODIC
  }

  /**
   * Publishes a successor for a request received during provider I/O.
   *
   * @param current locked state containing the newer revision
   */
  private void successor(SubscriptionSnapshot current) {
    store.request(
        current.binding().userId(),
        current.requestedRevision(),
        publish(current.binding().userId()),
        current.requestedAt());
  }

  /**
   * Publishes one bounded-budget job; failure rolls back the owning transaction.
   *
   * @param userId business identifier only; no provider identity enters the queue payload
   * @return accepted queue identity
   * @throws IllegalStateException if the trusted publication contract is rejected
   */
  private UUID publish(UUID userId) {
    PublicationResult result =
        publisher.publish(JOB_TYPE, 1, UUID.randomUUID().toString(), new RefreshPayload(userId));
    if (result instanceof PublicationResult.Accepted accepted) return accepted.id();
    throw new IllegalStateException("Subscription publication rejected");
  }

  /**
   * Durable payload containing only the local owner identifier.
   *
   * @param userId local billing owner
   */
  public record RefreshPayload(UUID userId) {}

  /**
   * Measures stale positive evidence for operational monitoring.
   *
   * @return number of positive observations outside the ten-minute freshness window
   */
  public long stalePositiveCount() {
    return store.stalePositiveCount(clock.instant().minus(SubscriptionPolicy.FRESHNESS));
  }
}
