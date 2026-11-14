package com.blockout.backend.notifications.application;

import com.blockout.backend.following.application.FollowContext.Target;
import com.blockout.backend.following.application.FollowContext.TargetType;
import com.blockout.backend.following.application.ReadFollowEligibility;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** One current audience snapshot, without display-season filtering or later additions. */
@Service
@RequiredArgsConstructor
public class AnnouncementRecipients {
  private final ReadFollowEligibility follows;

  /**
   * Selects once under the producer's sporting locks. Inbox foreign keys retain account integrity;
   * a required insertion failure propagates through the producer transaction.
   *
   * @param match current accepted team/pool identities under the producer's sporting locks
   * @return selected original accounts, without historical relation identities
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public Set<UUID> select(MatchView match) {
    Set<Target> targets =
        new HashSet<>(
            List.of(
                new Target(TargetType.TEAM, match.homeTeamId()),
                new Target(TargetType.TEAM, match.awayTeamId()),
                new Target(TargetType.POOL, match.poolId())));
    return follows.recipients(targets);
  }
}
