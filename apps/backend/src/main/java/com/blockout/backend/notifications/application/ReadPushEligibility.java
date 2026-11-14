package com.blockout.backend.notifications.application;

import com.blockout.backend.following.application.FollowContext;
import com.blockout.backend.following.application.FollowContext.Target;
import com.blockout.backend.following.application.FollowContext.TargetType;
import com.blockout.backend.following.application.ReadFollowEligibility;
import com.blockout.backend.generated.mobile.model.ResultStateEnum;
import com.blockout.backend.notifications.application.AllocateAnnouncements.Entry;
import com.blockout.backend.notifications.application.PushProvider.Message;
import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.notifications.domain.NotificationMessage;
import com.blockout.backend.sporting.application.ConsultationViews.MatchSummary;
import com.blockout.backend.sporting.application.ConsultationViews.Result;
import java.time.Clock;
import java.util.Optional;
import java.util.stream.Stream;
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
   * Rechecks the original owner/entry/age/visibility, destination and current qualifying follow. No
   * transaction survives this method or spans transport. Concurrent changes after this read cannot
   * recall a handed-off push.
   *
   * @param created newly committed personal allocation
   * @param target trigger-time association identity/revision/address
   * @return current safe message, or empty when eligibility has ended
   */
  @Transactional(
      readOnly = true,
      propagation = Propagation.REQUIRES_NEW,
      isolation = Isolation.REPEATABLE_READ)
  public Optional<Message> current(Entry created, PushSubscriptionStore.Target target) {
    if (!subscriptions.current(created.accountId(), target)) {
      return Optional.empty();
    }
    Optional<InboxViews.Entry> current =
        inbox.availableMember(new NotificationContext(created.accountId()), created.id());
    if (current.isEmpty()) {
      return Optional.empty();
    }
    InboxViews.Entry entry = current.orElseThrow();
    MatchSummary match = entry.match();
    if (!match.id().equals(created.matchId())) {
      return Optional.empty();
    }
    boolean followed =
        Stream.of(
                new Target(TargetType.TEAM, match.home().id()),
                new Target(TargetType.TEAM, match.away().id()),
                new Target(TargetType.POOL, match.pool().pool().id()))
            .anyMatch(origin -> follows.following(new FollowContext(created.accountId(), origin)));
    if (!followed) {
      return Optional.empty();
    }
    Result result = match.result();
    boolean finalResult = result != null && result.state() == ResultStateEnum.FINAL;
    if (entry.family() == NotificationFamily.LIVE_LINK
        && (finalResult
            || !entry.publicLink()
            || match.schedule().instant() == null
            || match.schedule().instant().toInstant().isAfter(clock.instant()))) {
      return Optional.empty();
    }
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
    return Optional.of(new Message(target, created.accountId(), entry.id(), match.id(), text));
  }
}
