package com.blockout.matches.match.live.report.application;

import com.blockout.shared.model.LiveLinkStatusEnum;
import java.time.Instant;
import java.util.Optional;

public interface MatchLiveLinkReportStore {

    Optional<MatchLiveLinkReportTarget> findNewestActive(Long matchId);

    boolean exists(Long liveLinkId, String reporterAuth0Id);

    void create(NewMatchLiveLinkReport report);

    long count(Long liveLinkId);

    void updateTarget(Long liveLinkId, int reportCount, LiveLinkStatusEnum status, Instant now);
}
