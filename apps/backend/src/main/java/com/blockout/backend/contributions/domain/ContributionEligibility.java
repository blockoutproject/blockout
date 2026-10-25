package com.blockout.backend.contributions.domain;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Local submission policy over current F02/F03/F05/F12 facts; performs no IO or mutation. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ContributionEligibility {

  /**
   * Assesses current authorization and revision before literal equality and quota refusal. Callers
   * supply facts reread under their ordered locks; this pure assessment acquires no locks.
   *
   * @param actor current usable original account and exact capabilities/evidence
   * @param match current owner-provided sporting/visibility facts, never calendar classification
   * @param current bounded current active/own-pending versions and revision/hold
   * @param expectedRevision revision captured for this explicit intent
   * @param proposed locally recognized literal address, or null for a read-only eligibility
   *     assessment
   * @param usage current persisted ordinary aggregate
   * @param now same action instant for age and sporting window
   * @return refusal, unchanged version or intended new-version state
   */
  public static Decision evaluate(
      Actor actor,
      Match match,
      Current current,
      long expectedRevision,
      StreamAddress proposed,
      ContributionQuota.Usage usage,
      Instant now) {
    if (!actor.moderator() && !actor.mayPublish()) return new Decision(Status.FORBIDDEN, null);
    if (!match.viewable() || match.date() == null)
      return new Decision(Status.MATCH_UNAVAILABLE, null);
    if (match.professional()) return new Decision(Status.PROFESSIONAL_MATCH, null);
    if (current.state().revision() != expectedRevision)
      return new Decision(Status.STALE_REVISION, null);
    if (!actor.moderator()) {
      if (current.active() != null && !actor.accountId().equals(current.active().ownerId()))
        return new Decision(Status.NOT_OWNER, null);
      if (actor.principalCreatedAt() == null) return new Decision(Status.ACCOUNT_AGE_UNKNOWN, null);
      if (now.isBefore(accountEligibleAt(actor.principalCreatedAt())))
        return new Decision(Status.ACCOUNT_TOO_YOUNG, null);
      if (!match.definitiveResult()) {
        if (match.confirmedStart() == null) return new Decision(Status.START_UNCONFIRMED, null);
        if (now.isBefore(windowOpensAt(match.confirmedStart())))
          return new Decision(Status.WINDOW_NOT_OPEN, null);
      }
    }
    for (ContributionVersion version :
        new ContributionVersion[] {current.active(), current.ownPending()}) {
      if (version != null
          && actor.accountId().equals(version.ownerId())
          && (version.state() == ContributionVersion.State.ACTIVE
              || version.state() == ContributionVersion.State.PENDING)
          && version.address().equals(proposed))
        return new Decision(Status.UNCHANGED, version.id());
    }
    if (actor.moderator()) return new Decision(Status.ACTIVE, null);
    ContributionQuota.Limit limit = ContributionQuota.limit(usage);
    if (limit == ContributionQuota.Limit.VERSION_LIMIT)
      return new Decision(Status.VERSION_LIMIT, null);
    if (limit == ContributionQuota.Limit.DAILY_MATCH_LIMIT)
      return new Decision(Status.DAILY_MATCH_LIMIT, null);
    return new Decision(
        requiresApproval(actor.moderator(), match.definitiveResult(), current.state())
            ? Status.PENDING
            : Status.ACTIVE,
        null);
  }

  /**
   * Resolves the ordinary publication age boundary from reliable retained principal evidence.
   *
   * @param principalCreatedAt reliable Auth0 creation instant
   * @return inclusive instant at which the seven elapsed days condition is satisfied
   */
  public static Instant accountEligibleAt(Instant principalCreatedAt) {
    return principalCreatedAt.plus(Duration.ofDays(7));
  }

  /**
   * Resolves the ordinary publication window independently of calendar display categories.
   *
   * @param confirmedStart reliable current sporting start instant
   * @return inclusive instant one hour before that start
   */
  public static Instant windowOpensAt(Instant confirmedStart) {
    return confirmedStart.minus(Duration.ofHours(1));
  }

  /**
   * Shares the approval rule between command decisions and current read eligibility.
   *
   * @param moderator exact current stream capability
   * @param definitiveResult current explicit sporting finality
   * @param state current unresolved report hold
   * @return whether an otherwise permitted submission must await approval
   */
  public static boolean requiresApproval(
      boolean moderator, boolean definitiveResult, ContributionState state) {
    return !moderator && (definitiveResult || state.reportHoldVersionId() != null);
  }

  /**
   * Current account context; F05 resolves usable profiles before this boundary.
   *
   * @param accountId original business lifecycle
   * @param mayPublish exact ordinary publication capability
   * @param moderator exact stream-links.moderate capability, never a generic role
   * @param principalCreatedAt reliable retained Auth0 evidence, or null
   */
  public record Actor(
      UUID accountId, boolean mayPublish, boolean moderator, Instant principalCreatedAt) {}

  /**
   * Current facts supplied by their owners, with no duplicate sporting classifier or account
   * mirror.
   *
   * @param viewable current accumulated F02/F03 restrictions permit public contribution
   * @param professional current F02 professional context, independent of club association
   * @param date usable sporting date, or null
   * @param confirmedStart F02 reliable confirmed start, or null for date-only/uncertain time
   * @param definitiveResult current F02 accepted definitive result, not F03 Completed
   */
  public record Match(
      boolean viewable,
      boolean professional,
      LocalDate date,
      Instant confirmedStart,
      boolean definitiveResult) {}

  /**
   * Bounded read performed by the future transaction owner.
   *
   * @param state existing or initial match revision/hold
   * @param active current active version, or null
   * @param ownPending caller's current pending version, or null
   */
  public record Current(
      ContributionState state, ContributionVersion active, ContributionVersion ownPending) {}

  /** Submission outcomes with distinct dependent-evidence and policy refusals. */
  public enum Status {
    INVALID_ADDRESS,
    ACTIVE,
    PENDING,
    UNCHANGED,
    FORBIDDEN,
    MATCH_UNAVAILABLE,
    PROFESSIONAL_MATCH,
    STALE_REVISION,
    NOT_OWNER,
    ACCOUNT_AGE_UNKNOWN,
    ACCOUNT_TOO_YOUNG,
    START_UNCONFIRMED,
    WINDOW_NOT_OPEN,
    VERSION_LIMIT,
    DAILY_MATCH_LIMIT
  }

  /**
   * Pure result; recording/charging a new version belongs to the transactional use case.
   *
   * @param status authorized outcome or refusal
   * @param existingVersionId exact active/pending version for an unchanged result, otherwise null
   */
  public record Decision(Status status, UUID existingVersionId) {}
}
