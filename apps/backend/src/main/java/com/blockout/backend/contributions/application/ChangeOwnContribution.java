package com.blockout.backend.contributions.application;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.contributions.domain.ContributionEligibility.Status;
import com.blockout.backend.contributions.domain.ContributionState;
import com.blockout.backend.contributions.domain.ContributionVersion;
import com.blockout.backend.contributions.domain.ContributionVersion.Decision;
import com.blockout.backend.contributions.domain.ContributionVersion.DecisionKind;
import com.blockout.backend.contributions.domain.ContributionVersion.State;
import com.blockout.backend.generated.mobile.model.StreamOwnerActionEnum;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.service.MatchContributionAccess;
import com.blockout.backend.sporting.application.service.MatchContributionAccess.Facts;
import java.time.Clock;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Owns exact-version cancellation and withdrawal without changing another version or its quota. */
@Service
@RequiredArgsConstructor
public class ChangeOwnContribution {
  private final MatchContributionAccess sporting;
  private final AccountAccess accounts;
  private final ContributionStore store;
  private final Clock clock;

  /**
   * Applies an admitted original owner's explicit action under sporting then sorted account locks.
   * Reads current attribution only after locking its retained actors so concurrent erasure cannot
   * be undone by a managed entity's lifecycle update. F12's ordinary admission and F05's current
   * usable identity grant the baseline owner capability; the moderation grant never permits this
   * personal route to act on another owner's history.
   *
   * @param owner original usable account, checked again under its erasure lock
   * @param matchId currently viewable sporting match
   * @param versionId exact selected personal version, never replaced by the current active version
   * @param revision viewed opaque match contribution revision
   * @param action explicit cancel or withdraw intent from the canonical contract
   * @return current exact version and revision, including a current terminal repetition
   * @throws AccountNotFoundException when the original lifecycle was erased before locking
   * @throws SportingResourceNotFoundException for an unavailable match or missing/foreign version
   * @throws ContributionRejectedException when the viewed revision is stale, including a no-op
   * @throws ContributionConflictException when the exact target has an incompatible lifecycle
   */
  @Transactional
  public ReadOwnContributions.Detail change(
      UUID owner, UUID matchId, UUID versionId, String revision, StreamOwnerActionEnum action) {
    Facts facts = sporting.lock(matchId);
    Set<UUID> affected = new HashSet<>(store.attributionAccounts(matchId));
    affected.add(owner);
    for (UUID account : affected.stream().sorted().toList()) {
      boolean exists = accounts.lock(account);
      if (account.equals(owner) && !exists) throw new AccountNotFoundException();
    }
    if (!facts.viewable()) throw new SportingResourceNotFoundException();
    ContributionVersion version =
        store
            .version(versionId)
            .filter(current -> current.matchId().equals(matchId) && owner.equals(current.ownerId()))
            .orElseThrow(SportingResourceNotFoundException::new);
    ContributionState state = store.state(matchId);
    if (!Long.toString(state.revision()).equals(revision))
      throw new ContributionRejectedException(Status.STALE_REVISION);
    State terminal = action == StreamOwnerActionEnum.CANCEL ? State.CANCELLED : State.WITHDRAWN;
    if (version.state() == terminal) return new ReadOwnContributions.Detail(revision, version);
    State required = action == StreamOwnerActionEnum.CANCEL ? State.PENDING : State.ACTIVE;
    if (version.state() != required) throw new ContributionConflictException();
    DecisionKind kind =
        action == StreamOwnerActionEnum.CANCEL
            ? DecisionKind.CANCELLATION
            : DecisionKind.WITHDRAWAL;
    ContributionVersion changed =
        store.decide(versionId, terminal, new Decision(kind, clock.instant(), owner));
    ContributionState next = store.advance(matchId, false);
    return new ReadOwnContributions.Detail(Long.toString(next.revision()), changed);
  }
}
