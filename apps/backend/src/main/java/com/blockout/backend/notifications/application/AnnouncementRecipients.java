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
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public List<Recipient> select(MatchView match) {
    Set<Target> targets =
        new HashSet<>(
            List.of(
                new Target(TargetType.TEAM, match.homeTeamId()),
                new Target(TargetType.TEAM, match.awayTeamId()),
                new Target(TargetType.POOL, match.poolId())));
    List<UUID> candidates = follows.recipients(targets).keySet().stream().sorted().toList();
    Set<UUID> usable = new HashSet<>();
    for (UUID accountId : candidates) if (accounts.lock(accountId)) usable.add(accountId);
    Map<UUID, Set<Relation>> current = follows.recipients(targets);
    List<Recipient> recipients = new ArrayList<>();
    for (UUID accountId : candidates) {
      Set<Relation> relations = current.getOrDefault(accountId, Set.of());
      if (usable.contains(accountId) && !relations.isEmpty())
        recipients.add(new Recipient(accountId, relations));
    }
    return List.copyOf(recipients);
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
