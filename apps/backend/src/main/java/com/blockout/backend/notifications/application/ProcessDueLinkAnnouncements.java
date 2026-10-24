package com.blockout.backend.notifications.application;

import com.blockout.backend.contributions.application.ContributionStore;
import com.blockout.backend.contributions.application.ReadPublicContribution;
import com.blockout.backend.sporting.application.service.MatchContributionAccess;
import com.blockout.backend.sporting.application.service.MatchContributionAccess.Facts;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Ordinary bounded eligibility pass; each candidate commits independently in a proxied method. */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProcessDueLinkAnnouncements {
  private final ContributionStore store;
  private final DueMatch transaction;

  /**
   * Visits active links in bounded identity pages; failure leaves a match for the next normal pass.
   * No exact-H audience, timer per match or durable retry is retained.
   */
  public void run() {
    UUID after = null;
    List<UUID> candidates;
    do {
      candidates = store.activeMatches(after);
      for (UUID id : candidates) {
        try {
          transaction.process(id);
        } catch (RuntimeException failure) {
          log.atError()
              .addKeyValue("operation", "link_announcement_pass")
              .addKeyValue("scope", id)
              .setCause(failure)
              .log("Link announcement candidate failed");
        }
      }
      if (!candidates.isEmpty()) after = candidates.getLast();
    } while (candidates.size() == 100);
  }

  /** Required independent transaction owner, separate from the nontransactional scheduled loop. */
  @Service
  @RequiredArgsConstructor
  public static class DueMatch {
    private final MatchContributionAccess sporting;
    private final ReadPublicContribution links;
    private final AnnouncementRecipients recipients;
    private final ProcessLinkAnnouncement announcements;
    private final NotificationStore notifications;
    private final AfterCommitAnnouncements handoff;
    private final Clock clock;

    /**
     * Rereads actual eligibility under sporting roots before complete audience locking.
     *
     * @param matchId candidate from current active links, possibly changed since selection
     */
    @Transactional
    public void process(UUID matchId) {
      Facts facts = sporting.lock(matchId);
      if (notifications.facts(matchId).liveProcessed()) return;
      if (!facts.viewable()
          || facts.definitiveResult()
          || facts.schedule().reliableStart() == null
          || clock.instant().isBefore(facts.schedule().reliableStart())
          || links.read(matchId).isEmpty()) return;
      handoff.submit(
          announcements.process(
              new ProcessLinkAnnouncement.Context(
                  facts.match(),
                  true,
                  false,
                  facts.schedule().reliableStart(),
                  false,
                  clock.instant()),
              recipients.select(facts.match())));
    }
  }
}
