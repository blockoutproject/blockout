package com.blockout.backend.identity.subscription.application;

import com.blockout.backend.identity.subscription.domain.BillingEnvironment;
import com.blockout.backend.identity.subscription.domain.SubscriptionFailure;
import java.time.Instant;
import java.util.*;

/** Owner persistence; writes join the caller's short transaction. */
public interface SubscriptionStore {
  /**
   * Reads an existing owner projection without writes.
   *
   * @param userId local owner
   * @return stored projection when initialized
   */
  Optional<SubscriptionSnapshot> find(UUID userId);

  /**
   * Creates missing state and locks the owner row for request serialization.
   *
   * @param userId existing billing owner
   * @return locked projection
   */
  SubscriptionSnapshot lock(UUID userId);

  /**
   * Records the current request and job reference.
   *
   * @param userId locked owner
   * @param revision durable request revision
   * @param jobId current queue identity
   * @param requestedAt last effective user request time
   */
  void request(UUID userId, long revision, UUID jobId, Instant requestedAt);

  /**
   * Replaces proof after a complete current-revision observation.
   *
   * @param userId locked owner
   * @param revision processed revision
   * @param observation complete result
   * @param now verification timestamp
   * @param nextRefreshAt periodic due time, nullable for negative evidence
   */
  void verified(
      UUID userId,
      long revision,
      SubscriptionObservation.Verified observation,
      Instant now,
      Instant nextRefreshAt);

  /**
   * Records failure without extending proof.
   *
   * @param userId locked owner
   * @param failure safe classification
   * @param now attempt time
   */
  void failed(UUID userId, SubscriptionFailure failure, Instant now);

  /**
   * Invalidates access before reconciling a transfer.
   *
   * @param userId locked outgoing owner
   */
  void invalidate(UUID userId);

  /**
   * Finds bounded periodic candidates, including bindings without state.
   *
   * @param now selection time
   * @return up to 100 owner identifiers
   */
  List<UUID> due(Instant now);

  /**
   * Resolves known customers in deterministic lock order without provisioning.
   *
   * @param project provider namespace
   * @param environment production or sandbox
   * @param customers exact provider customer identifiers
   * @return known owners ordered by UUID
   */
  List<UUID> owners(String project, BillingEnvironment environment, Set<String> customers);

  /**
   * Deduplicates a receipt in the same transaction as all derived requests.
   *
   * @param id provider event identifier
   * @param type provider event type
   * @param eventAt original event time
   * @param receivedAt local receipt time
   * @return true only for a new event
   */
  boolean receipt(String id, String type, Instant eventAt, Instant receivedAt);

  /**
   * Moves the scan cursor for already queued work without requesting another revision.
   *
   * @param userId locked owner
   * @param next next scan opportunity
   */
  void deferScan(UUID userId, Instant next);

  /**
   * Counts positive evidence older than freshness without reading queue internals.
   *
   * @param cutoff oldest fresh verification instant
   * @return stale positive proof count
   */
  long stalePositiveCount(Instant cutoff);
}
