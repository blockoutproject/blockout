package com.blockout.backend.notifications.application;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.following.application.FollowContext.Target;
import com.blockout.backend.following.application.FollowContext.TargetType;
import com.blockout.backend.following.application.FollowEligibility;
import com.blockout.backend.following.application.FollowStore.Relation;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Current confirmed union and original-account locks; no historical audience or display season. */
@Service
@RequiredArgsConstructor
public class AnnouncementRecipients {
  private final FollowEligibility follows;
  private final AccountAccess accounts;

  /**
   * Collects candidates before sorted account locks, then rereads current relation identities. The
   * caller must already hold every necessary F02 root; no root may be acquired afterward.
   *
   * @param match current accepted team/pool identities under the producer's sporting locks
   * @return one immutable original relation union per still-existing account
   * @throws AnnouncementAudienceChangedException if the current audience requires an unheld
   *     account; no producer allowance may commit from this failed transaction
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public List<Recipient> select(MatchView match) {
    return select(match, Set.of()).recipients();
  }

  /**
   * Locks the complete producer/audience union, then rereads current follow incarnations.
   *
   * @param match locked sporting identity
   * @param additionalAccounts producer participants, including the submitting actor
   * @return current audience and all surviving locked identities
   * @throws AnnouncementAudienceChangedException if the relookup requires an unheld account; the
   *     whole producer transaction must fail without consuming its allowance
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public Selection select(MatchView match, Set<UUID> additionalAccounts) {
    Set<Target> targets =
        new HashSet<>(
            List.of(
                new Target(TargetType.TEAM, match.homeTeamId()),
                new Target(TargetType.TEAM, match.awayTeamId()),
                new Target(TargetType.POOL, match.poolId())));
    Set<UUID> candidates = new HashSet<>(follows.recipients(targets).keySet());
    candidates.addAll(additionalAccounts);
    List<UUID> usable = new ArrayList<>();
    for (UUID accountId : candidates.stream().sorted().toList())
      if (accounts.lock(accountId)) usable.add(accountId);
    Map<UUID, Set<Relation>> current = follows.recipients(targets);
    Set<UUID> locked = Set.copyOf(usable);
    // A new lower UUID cannot be locked now without reversing the global account order.
    if (!locked.containsAll(current.keySet())) throw new AnnouncementAudienceChangedException();
    List<Recipient> recipients = new ArrayList<>();
    for (UUID accountId : usable) {
      Set<Relation> relations = current.getOrDefault(accountId, Set.of());
      if (!relations.isEmpty()) recipients.add(new Recipient(accountId, relations));
    }
    return new Selection(List.copyOf(recipients), locked);
  }

  /**
   * Whole locked participant set and current audience; valid only in this transaction.
   *
   * @param recipients current eligible audience after account locking
   * @param accounts all surviving locked identities, including producer participants
   */
  public record Selection(List<Recipient> recipients, Set<UUID> accounts) {
    /**
     * Detaches values from mutable query collections.
     *
     * @param recipients current audience
     * @param accounts surviving locked identities
     */
    public Selection {
      recipients = List.copyOf(recipients);
      accounts = Set.copyOf(accounts);
    }
  }

  /**
   * Current original-account audience retained only in memory for future send continuity checks.
   *
   * @param accountId original lifecycle, never a later principal replacement
   * @param relations selected current relation incarnations
   */
  public record Recipient(UUID accountId, Set<Relation> relations) {
    /**
     * Detaches the original relation union from mutable caller collections.
     *
     * @param accountId original owner
     * @param relations actual trigger-time origins
     */
    public Recipient {
      relations = Set.copyOf(relations);
    }
  }
}
