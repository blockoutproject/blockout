package com.blockout.backend.notifications.application;

import com.blockout.backend.following.application.ReadFollowEligibility;
import com.blockout.backend.notifications.application.AllocateAnnouncements.Entry;
import com.blockout.backend.notifications.application.PushProvider.Message;
import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.notifications.domain.NotificationMessage;
import com.blockout.backend.sporting.application.ConsultationViews.MatchSummary;
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
   * Opens a fresh snapshot per captured device to recheck the original owner, entry, age,
   * visibility, destination and current qualifying follow. Concurrent changes after this read
   * cannot recall a handed-off push.
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
    if (!match.id().equals(created.matchId())
        || !follows.followsMatch(
            created.accountId(), match.home().id(), match.away().id(), match.pool().pool().id())) {
      return Optional.empty();
    }
    NotificationMessage.Facts facts = entry.editorialFacts();
    if (entry.family() == NotificationFamily.LIVE_LINK
        && (facts.finalResult()
            || !facts.publicLink()
            || match.schedule().instant() == null
            || match.schedule().instant().toInstant().isAfter(clock.instant()))) {
      return Optional.empty();
    }
    NotificationMessage text = NotificationMessage.render(entry.family(), entry.variant(), facts);
    return Optional.of(new Message(target, created.accountId(), entry.id(), match.id(), text));
  }
}
