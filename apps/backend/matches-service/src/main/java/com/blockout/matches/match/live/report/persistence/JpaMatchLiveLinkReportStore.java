package com.blockout.matches.match.live.report.persistence;

import com.blockout.matches.match.live.persistence.MatchLiveLink;
import com.blockout.matches.match.live.persistence.MatchLiveLinkRepository;
import com.blockout.matches.match.live.report.application.MatchLiveLinkReportStore;
import com.blockout.matches.match.live.report.application.MatchLiveLinkReportTarget;
import com.blockout.matches.match.live.report.application.NewMatchLiveLinkReport;
import com.blockout.matches.match.persistence.Match;
import com.blockout.matches.match.persistence.MatchRepository;
import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.MatchStatusEnum;
import java.time.Instant;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JpaMatchLiveLinkReportStore implements MatchLiveLinkReportStore {

    private final MatchRepository matches;
    private final MatchLiveLinkRepository liveLinks;
    private final MatchLiveLinkReportRepository reports;
    private final MatchLiveLinkReportPersistenceMapper mapper;

    @Override
    public Optional<MatchLiveLinkReportTarget> findNewestActive(Long matchId) {
        return liveLinks.findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatusEnum.ACTIVE)
                .map(liveLink -> mapper.toTarget(liveLink, matchStatus(liveLink, matchId)));
    }

    @Override
    public boolean exists(Long liveLinkId, String reporterAuth0Id) {
        return reports.existsByLiveLink_IdAndReporterAuth0Id(liveLinkId, reporterAuth0Id);
    }

    @Override
    public void create(NewMatchLiveLinkReport report) {
        MatchLiveLink liveLink = liveLinks.getReferenceById(report.liveLinkId());
        reports.save(mapper.toNewEntity(liveLink, report));
    }

    @Override
    public long count(Long liveLinkId) {
        return reports.countByLiveLink_Id(liveLinkId);
    }

    @Override
    public void updateTarget(
            Long liveLinkId,
            int reportCount,
            LiveLinkStatusEnum status,
            Instant now) {
        MatchLiveLink liveLink = liveLinks.getReferenceById(liveLinkId);
        liveLink.setReportCount(reportCount);
        liveLink.setStatus(LiveLinkStatusEnum.valueOf(status.getValue()));
        liveLink.setLastUpdate(now);
        liveLinks.save(liveLink);
    }

    private MatchStatusEnum matchStatus(MatchLiveLink liveLink, Long matchId) {
        MatchStatusEnum status = liveLink.getMatch() == null
                ? matches.findById(matchId).map(Match::getStatus).orElse(null)
                : liveLink.getMatch().getStatus();
        return status == null ? null : MatchStatusEnum.fromValue(status.name());
    }
}
