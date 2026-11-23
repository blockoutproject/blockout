package com.blockout.backend.notifications.application;

import com.blockout.backend.contributions.application.ReadPublicContribution;
import com.blockout.backend.notifications.application.AllocateAnnouncements.Entry;
import com.blockout.backend.notifications.domain.MatchAnnouncementFacts;
import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.sporting.application.service.MatchContributionAccess.Facts;
import com.blockout.backend.sporting.application.service.MatchContributionAccess.LinkAnnouncementFacts;
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
   * Processes a version made active by F08 in this transaction under the required sporting locks.
   * That write establishes link presence and can trigger a live or post-result announcement.
   *
   * @param sporting current locked facts for the published match
   * @param now publication-processing instant supplied by F08
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public List<Entry> processAcceptedPublication(Facts sporting, Instant now) {
    return process(
        new LinkAnnouncementFacts(
            sporting.match(),
            sporting.schedule().reliableStart(),
            sporting.definitiveResult(),
            sporting.viewable()),
        now,
        true);
  }

  /** Rechecks live eligibility and current link presence under the due candidate's match lock. */
  @Transactional(propagation = Propagation.MANDATORY)
  public List<Entry> processDueMatch(LinkAnnouncementFacts sporting, Instant now) {
    return process(sporting, now, false);
  }

  private List<Entry> process(
      LinkAnnouncementFacts sporting, Instant now, boolean acceptedPublication) {
    if (!sporting.viewable()) {
      return List.of();
    }
    boolean finalResult = sporting.definitiveResult();
    Instant start = sporting.reliableStart();
    if (finalResult && !acceptedPublication) {
      return List.of();
    }
    if (!finalResult && (start == null || now.isBefore(start))) {
      return List.of();
    }
    UUID matchId = sporting.match().id();
    MatchAnnouncementFacts facts = store.facts(matchId);
    boolean processed = finalResult ? facts.postResultProcessed() : facts.liveProcessed();
    if (processed || (!acceptedPublication && !links.availableForConsultableMatch(matchId))) {
      return List.of();
    }

    NotificationFamily family =
        finalResult ? NotificationFamily.POST_RESULT_LINK : NotificationFamily.LIVE_LINK;
    store.saveFacts(finalResult ? facts.consumePostResultLink() : facts.consumeLive());
    return allocations.create(matchId, family, recipients.select(sporting.match()), now);
  }
}
