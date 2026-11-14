package com.blockout.backend.notifications.application;

import com.blockout.backend.notifications.application.AllocateAnnouncements.Entry;
import com.blockout.backend.notifications.domain.MatchAnnouncementFacts;
import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Required link allowance/inbox writes inside the producer transaction. */
@Service
@RequiredArgsConstructor
public class ProcessLinkAnnouncement {
  private final NotificationStore store;
  private final AllocateAnnouncements allocations;
  private final AnnouncementRecipients recipients;

  /**
   * Processes current availability; a due pass never invents a later publication.
   *
   * @param context current accepted owner facts, with public visibility already applied
   * @return new allocations for after-commit handoff
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public List<Entry> process(Context context) {
    MatchAnnouncementFacts facts = store.facts(context.match().id());
    if (!context.publicLink()) {
      return List.of();
    }
    NotificationFamily family;
    if (context.finalResult()) {
      if (!context.acceptedPublication() || facts.postResultProcessed()) {
        return List.of();
      }
      family = NotificationFamily.POST_RESULT_LINK;
      store.saveFacts(facts.consumePostResultLink());
    } else {
      if (facts.liveProcessed()
          || context.start() == null
          || context.now().isBefore(context.start())) {
        return List.of();
      }
      family = NotificationFamily.LIVE_LINK;
      store.saveFacts(facts.consumeLive());
    }
    return allocations.create(
        context.match().id(), family, recipients.select(context.match()), context.now());
  }

  /**
   * Current facts at actual processing; no address or historical audience is retained here.
   *
   * @param match locked sporting identity
   * @param publicLink current accepted availability after sporting visibility checks
   * @param finalResult current explicit F02 finality
   * @param start reliable H, or null when unconfirmed
   * @param acceptedPublication true only for an actually accepted public transition
   * @param now actual processing instant, independent from source publication time
   */
  public record Context(
      MatchView match,
      boolean publicLink,
      boolean finalResult,
      Instant start,
      boolean acceptedPublication,
      Instant now) {}
}
