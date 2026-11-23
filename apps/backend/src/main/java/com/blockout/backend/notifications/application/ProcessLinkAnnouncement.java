package com.blockout.backend.notifications.application;

import com.blockout.backend.contributions.application.ReadPublicContribution;
import com.blockout.backend.notifications.application.AllocateAnnouncements.Entry;
import com.blockout.backend.notifications.domain.MatchAnnouncementFacts;
import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.sporting.application.service.MatchContributionAccess.Facts;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
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
  private final ReadPublicContribution links;

  /**
   * Processes a newly accepted publication under the caller's sporting locks. This event may
   * consume a post-result allowance.
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public List<Entry> processPublication(Facts sporting, Instant now) {
    return process(sporting, now, true);
  }

  /** Rechecks live eligibility and current link presence under the due candidate's match lock. */
  @Transactional(propagation = Propagation.MANDATORY)
  public List<Entry> processDueMatch(Facts sporting, Instant now) {
    return process(sporting, now, false);
  }

  private List<Entry> process(Facts sporting, Instant now, boolean publication) {
    if (!sporting.viewable()) {
      return List.of();
    }
    boolean finalResult = sporting.definitiveResult();
    Instant start = sporting.schedule().reliableStart();
    if (finalResult && !publication) {
      return List.of();
    }
    if (!finalResult && (start == null || now.isBefore(start))) {
      return List.of();
    }
    UUID matchId = sporting.match().id();
    MatchAnnouncementFacts facts = store.facts(matchId);
    boolean processed = finalResult ? facts.postResultProcessed() : facts.liveProcessed();
    if (processed || !links.availableForConsultableMatch(matchId)) {
      return List.of();
    }

    NotificationFamily family =
        finalResult ? NotificationFamily.POST_RESULT_LINK : NotificationFamily.LIVE_LINK;
    store.saveFacts(finalResult ? facts.consumePostResultLink() : facts.consumeLive());
    return allocations.create(matchId, family, recipients.select(sporting.match()), now);
  }
}
