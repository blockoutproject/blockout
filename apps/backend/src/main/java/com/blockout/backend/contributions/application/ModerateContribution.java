package com.blockout.backend.contributions.application;

import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.contributions.domain.ContributionDecision;
import com.blockout.backend.contributions.domain.ContributionEligibility.Status;
import com.blockout.backend.contributions.domain.ContributionVersion;
import com.blockout.backend.contributions.domain.ContributionVersion.Decision;
import com.blockout.backend.contributions.domain.ContributionVersion.DecisionKind;
import com.blockout.backend.contributions.domain.ContributionVersion.State;
import com.blockout.backend.generated.mobile.model.StreamModerationActionEnum;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.service.MatchContributionAccess;
import com.blockout.backend.sporting.application.service.MatchContributionAccess.Facts;
import java.time.Clock;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Atomic exact-version decisions with sporting, sorted account and original-actor protection. */
@Service
@RequiredArgsConstructor
public class ModerateContribution {
  private final MatchContributionAccess sporting;
  private final AccountAccess accounts;
  private final CurrentPermissions permissions;
  private final ContributionStore store;
  private final AnnounceContribution transitions;
  private final Clock clock;

  /**
   * Approves the existing proposal, rejects only it, or withdraws only the active target. Every
   * action retains actor and attribution protection; F07 selects only an allocated audience.
   *
   * @param actor original admitted moderator, rechecked after account locks
   * @param matchId retained private sporting root
   * @param versionId exact selected version
   * @param revision viewed match revision, checked before terminal no-op
   * @param action complete canonical intent
   * @return exact terminal member and accepted revision; no-op adds no decision
   * @throws AccountNotFoundException when the original actor was erased before locking
   * @throws SportingResourceNotFoundException when the exact version is absent from this match
   * @throws ContributionConflictException for an incompatible target state
   * @throws ContributionRejectedException for stale revision or prohibited publication
   * @throws AccessDeniedException when the current complete grant is absent
   */
  @Transactional
  public SubmitContribution.Outcome change(
      UUID actor,
      UUID matchId,
      UUID versionId,
      String revision,
      StreamModerationActionEnum action) {
    Facts facts = sporting.lock(matchId);
    boolean publishes = action == StreamModerationActionEnum.APPROVE;
    lock(actor, facts, versionId);
    ContributionVersion target = target(matchId, versionId, revision);
    State terminal =
        switch (action) {
          case APPROVE -> State.ACTIVE;
          case REJECT -> State.REJECTED;
          case WITHDRAW -> State.WITHDRAWN;
        };
    if (target.state() == terminal) {
      return new SubmitContribution.Outcome(target, revision, false);
    }
    State required = action == StreamModerationActionEnum.WITHDRAW ? State.ACTIVE : State.PENDING;
    if (target.state() != required) {
      throw new ContributionConflictException();
    }
    ContributionVersion changed;
    if (publishes) {
      requirePublication(facts);
      changed = store.select(versionId, actor, clock.instant(), false);
    } else {
      changed =
          store.decide(
              versionId,
              terminal,
              new Decision(
                  action == StreamModerationActionEnum.REJECT
                      ? DecisionKind.REJECTION
                      : DecisionKind.WITHDRAWAL,
                  clock.instant(),
                  actor));
    }
    String next = Long.toString(store.advance(matchId, publishes).revision());
    if (publishes) {
      transitions.published(facts, clock.instant());
    }
    return new SubmitContribution.Outcome(changed, next, false);
  }

  /**
   * Creates a new exempt version from an eligible historical source without changing that source.
   *
   * @param actor original current moderator
   * @param matchId retained private sporting root
   * @param versionId exact historical source
   * @param revision viewed revision; an obsolete retry cannot create another version
   * @return newly active member with source lineage and current post-lock owner
   * @throws ContributionConflictException for an active, pending or cancelled source
   * @throws ContributionRejectedException for stale revision or sporting restrictions
   * @throws AccountNotFoundException when the original actor was erased before locking
   * @throws SportingResourceNotFoundException when the historical source is absent from this match
   * @throws AccessDeniedException when the current moderation grant is absent
   */
  @Transactional
  public SubmitContribution.Outcome reactivate(
      UUID actor, UUID matchId, UUID versionId, String revision) {
    Facts facts = sporting.lock(matchId);
    lock(actor, facts, versionId);
    ContributionVersion source = target(matchId, versionId, revision);
    if (!ContributionDecision.canReactivate(source.state())) {
      throw new ContributionConflictException();
    }
    requirePublication(facts);
    ContributionVersion created = store.select(versionId, actor, clock.instant(), true);
    String next = Long.toString(store.advance(matchId, true).revision());
    transitions.published(facts, clock.instant());
    return new SubmitContribution.Outcome(created, next, true);
  }

  /**
   * Locks sorted actor and scalar attributions before loading a mutable version.
   *
   * @param actor original actor to retain
   * @param facts sporting facts under already locked roots
   * @param versionId historical source whose attribution also needs erasure coordination
   * @throws AccountNotFoundException when the original actor was erased before locking
   * @throws AccessDeniedException when the current moderation grant is absent
   */
  private void lock(UUID actor, Facts facts, UUID versionId) {
    Set<UUID> affected = new HashSet<>(store.attributionAccounts(facts.match().id()));
    affected.addAll(store.versionAttributionAccounts(versionId));
    affected.add(actor);
    for (UUID account : affected.stream().sorted().toList()) {
      boolean exists = accounts.lock(account);
      if (account.equals(actor) && !exists) {
        throw new AccountNotFoundException();
      }
    }
    if (!permissions.forAccount(actor).contains(Permission.MODERATE_STREAM_LINKS)) {
      throw new AccessDeniedException("Action is not permitted");
    }
  }

  /**
   * Rereads ownership only after locks, then compares revision before considering a no-op.
   *
   * @param matchId locked root
   * @param versionId exact member
   * @param revision viewed revision
   * @return detached current member
   * @throws ContributionRejectedException when the viewed match revision is stale
   * @throws SportingResourceNotFoundException when the version is absent from this match
   */
  private ContributionVersion target(UUID matchId, UUID versionId, String revision) {
    if (!Long.toString(store.state(matchId).revision()).equals(revision)) {
      throw new ContributionRejectedException(Status.STALE_REVISION);
    }
    return store
        .version(versionId)
        .filter(v -> v.matchId().equals(matchId))
        .orElseThrow(SportingResourceNotFoundException::new);
  }

  /**
   * Private read access never overrides independent public sporting restrictions.
   *
   * @param facts current locked owner facts
   * @throws ContributionRejectedException when current sporting restrictions prohibit publication
   */
  private void requirePublication(Facts facts) {
    if (!facts.viewable()) {
      throw new ContributionRejectedException(Status.MATCH_UNAVAILABLE);
    }
    if (facts.professional()) {
      throw new ContributionRejectedException(Status.PROFESSIONAL_MATCH);
    }
  }
}
