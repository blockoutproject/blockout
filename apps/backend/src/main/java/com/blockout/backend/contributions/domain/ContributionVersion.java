package com.blockout.backend.contributions.domain;

import java.time.Instant;
import java.util.UUID;

/**
 * Detached version facts; publication and a later lifecycle decision remain independently readable.
 *
 * @param id backend version identity
 * @param matchId F02 owner
 * @param address literal recognized address
 * @param ownerId original F05 lifecycle, or null after erasure
 * @param state current lifecycle
 * @param createdAt immutable creation instant
 * @param quotaParticipating immutable ordinary-submission participation
 * @param sourceVersionId historical reactivation source, or null
 * @param replacedByVersionId replacement on this match, or null
 * @param publication initial publication/approval, or null while never published
 * @param decision later lifecycle decision, or null
 */
public record ContributionVersion(
    UUID id,
    UUID matchId,
    StreamAddress address,
    UUID ownerId,
    State state,
    Instant createdAt,
    boolean quotaParticipating,
    UUID sourceVersionId,
    UUID replacedByVersionId,
    Decision publication,
    Decision decision) {
  /**
   * Supplies existing owner and useful decision actors for bounded current-name projection.
   *
   * @return distinct non-null original-account references; no reporter identity is included
   */
  public java.util.Set<UUID> attributionAccounts() {
    return java.util.stream.Stream.of(
            ownerId,
            publication == null ? null : publication.actorId(),
            decision == null ? null : decision.actorId())
        .filter(java.util.Objects::nonNull)
        .collect(java.util.stream.Collectors.toUnmodifiableSet());
  }

  /** Owned lifecycle states, persisted as stable strings. */
  public enum State {
    ACTIVE,
    PENDING,
    REJECTED,
    CANCELLED,
    SUPERSEDED,
    WITHDRAWN,
    HIDDEN,
    REPLACED
  }

  /** Useful business decisions rather than a command/event journal. */
  public enum DecisionKind {
    PUBLICATION,
    APPROVAL,
    REACTIVATION,
    REJECTION,
    CANCELLATION,
    SUPERSESSION,
    WITHDRAWAL,
    HIDING,
    REPLACEMENT
  }

  /**
   * A retained decision fact whose attribution may be erased independently.
   *
   * @param kind accepted action
   * @param at original instant, never changed by erasure
   * @param actorId original F05 actor, or null after erasure/for automatic hiding
   */
  public record Decision(DecisionKind kind, Instant at, UUID actorId) {}
}
