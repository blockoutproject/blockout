package com.blockout.backend.contributions.application;

import com.blockout.backend.notifications.application.AfterCommitAnnouncements;
import com.blockout.backend.notifications.application.ProcessLinkAnnouncement;
import com.blockout.backend.sporting.application.service.MatchContributionAccess.Facts;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Required accepted-publication participant; refusals, pending proposals and no-ops never enter.
 */
@Service
@RequiredArgsConstructor
public class AnnounceContribution {
  private final ReadPublicContribution links;
  private final ProcessLinkAnnouncement announcements;
  private final AfterCommitAnnouncements handoff;

  /**
   * Composes actual current availability under retained match/account locks.
   *
   * @param facts current F02 context
   * @param now actual publication-processing instant
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public void published(Facts facts, Instant now) {
    handoff.submit(
        announcements.process(
            new ProcessLinkAnnouncement.Context(
                facts.match(),
                links.read(facts.match().id()).isPresent(),
                facts.definitiveResult(),
                facts.schedule().reliableStart(),
                true,
                now)));
  }
}
