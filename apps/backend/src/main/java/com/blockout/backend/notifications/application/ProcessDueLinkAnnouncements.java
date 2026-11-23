package com.blockout.backend.notifications.application;

import com.blockout.backend.sporting.application.service.MatchContributionAccess;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Ordinary bounded eligibility pass; each candidate commits independently in a proxied method. */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProcessDueLinkAnnouncements {
  private static final int PAGE_SIZE = 100;

  private final NotificationStore store;
  private final ProcessDueMatch transaction;

  /**
   * Reconsiders active links with an available live allowance. Mutable eligibility is checked in
   * each match transaction. A failed candidate can return on the next ordinary pass.
   */
  @Transactional(propagation = Propagation.NEVER)
  public void run() {
    UUID after = null;
    while (true) {
      List<UUID> candidates = store.liveLinkCandidates(after, PAGE_SIZE);
      for (UUID id : candidates) {
        try {
          transaction.process(id);
        } catch (RuntimeException failure) {
          log.atError()
              .addKeyValue("operation", "link_announcement_pass")
              .addKeyValue("scope", id)
              .addKeyValue("reason", failure.getClass().getSimpleName())
              .log("Link announcement candidate failed");
        }
      }
      if (candidates.size() < PAGE_SIZE) {
        return;
      }
      after = candidates.getLast();
    }
  }

  /** Required independent transaction owner, separate from the nontransactional scheduled loop. */
  @Service
  @RequiredArgsConstructor
  public static class ProcessDueMatch {
    private final MatchContributionAccess sporting;
    private final ProcessLinkAnnouncement announcements;
    private final AfterCommitAnnouncements handoff;
    private final Clock clock;

    /**
     * Holds the sporting roots through current eligibility and announcement processing.
     *
     * @param matchId candidate from current active links, possibly changed since selection
     */
    @Transactional
    public void process(UUID matchId) {
      handoff.submit(
          announcements.processDueMatch(
              sporting.lockForLinkAnnouncement(matchId), clock.instant()));
    }
  }
}
