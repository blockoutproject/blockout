package com.blockout.backend.notifications.application;

import com.blockout.backend.following.application.FollowContext.Relation;
import com.blockout.backend.following.application.FollowContext.TargetType;
import com.blockout.backend.following.application.ReadFollowEligibility;
import com.blockout.backend.generated.mobile.model.ResultStateEnum;
import com.blockout.backend.notifications.application.AllocateAnnouncements.Created;
import com.blockout.backend.notifications.application.InboxViews.Entry;
import com.blockout.backend.notifications.application.PushProvider.Message;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Target;
import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.notifications.domain.NotificationMessage;
import com.blockout.backend.sporting.application.ConsultationViews.MatchSummary;
import com.blockout.backend.sporting.application.ConsultationViews.Result;
import java.time.Clock;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Reuses current inbox, contribution and follow owners in one short pre-handoff SQL snapshot. */
@Service
@RequiredArgsConstructor
public class ReadPushEligibility {
  private final ReadInbox inbox;
  private final ReadFollowEligibility follows;
  private final PushSubscriptionStore subscriptions;
  private final Clock clock;

  /**
   * Rechecks the original owner/entry/age/visibility, target and at least one original origin. No
   * transaction survives this method or spans transport. Concurrent changes after this read cannot
   * recall a handed-off push.
   *
   * @param created newly committed allocation with original relation incarnations
   * @param target trigger-time association identity/revision/address
   * @return current safe message, or empty when eligibility has ended
   */
  @Transactional(
      readOnly = true,
      propagation = Propagation.REQUIRES_NEW,
      isolation = Isolation.REPEATABLE_READ)
  public Optional<Message> current(Created created, Target target) {
    if (!subscriptions.current(created.entry().accountId(), target)) return Optional.empty();
    Optional<Entry> current =
        inbox.availableMember(
            new NotificationContext(created.entry().accountId()), created.entry().id());
    if (current.isEmpty()) return Optional.empty();
    Entry entry = current.orElseThrow();
    MatchSummary match = entry.match();
    if (!match.id().equals(created.entry().matchId())) return Optional.empty();
    boolean continuous =
        created.relations().stream()
            .anyMatch(
                relation ->
                    relation.accountId().equals(created.entry().accountId())
                        && isOrigin(relation, match)
                        && follows.stillPresent(relation));
    if (!continuous) return Optional.empty();
    Result result = match.result();
    boolean finalResult = result != null && result.state() == ResultStateEnum.FINAL;
    if (entry.family() == NotificationFamily.LIVE_LINK
        && (finalResult
            || !entry.publicLink()
            || match.schedule().instant() == null
            || match.schedule().instant().toInstant().isAfter(clock.instant())))
      return Optional.empty();
    NotificationMessage text =
        NotificationMessage.render(
            entry.family(),
            entry.variant(),
            new NotificationMessage.Facts(
                match.home().name(),
                match.away().name(),
                finalResult,
                result == null ? null : result.homeSets(),
                result == null ? null : result.awaySets(),
                result == null ? null : result.specialLabel(),
                entry.publicLink()));
    return Optional.of(
        new Message(target, created.entry().accountId(), entry.id(), match.id(), text));
  }

  /**
   * Requires an original relation to remain an origin of the current match, even after corrections.
   *
   * @param relation captured original typed follow
   * @param match current authorized sporting projection
   * @return whether its target is still one of this match's teams or pool
   */
  private boolean isOrigin(Relation relation, MatchSummary match) {
    return relation.target().type() == TargetType.TEAM
        ? relation.target().id().equals(match.home().id())
            || relation.target().id().equals(match.away().id())
        : relation.target().id().equals(match.pool().pool().id());
  }
}
