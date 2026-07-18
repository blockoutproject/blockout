package com.blockout.matches.match.live.report.persistence;

import com.blockout.matches.match.live.persistence.MatchLiveLink;
import com.blockout.matches.match.live.report.application.MatchLiveLinkReportTarget;
import com.blockout.matches.match.live.report.application.NewMatchLiveLinkReport;
import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.MatchStatusEnum;
import org.springframework.stereotype.Component;

@Component
public class MatchLiveLinkReportPersistenceMapper {

    public MatchLiveLinkReportTarget toTarget(MatchLiveLink liveLink, MatchStatusEnum matchStatus) {
        return new MatchLiveLinkReportTarget(
                liveLink.getId(), liveLink.getMatch() == null ? null : liveLink.getMatch().getId(), matchStatus,
                liveLink.getStatus() == null ? null : LiveLinkStatusEnum.fromValue(liveLink.getStatus().name()));
    }

    public MatchLiveLinkReport toNewEntity(MatchLiveLink liveLink, NewMatchLiveLinkReport report) {
        return MatchLiveLinkReport.builder()
                .liveLink(liveLink)
                .reporterAuth0Id(report.reporterAuth0Id())
                .reason(report.reason())
                .createdAt(report.createdAt())
                .build();
    }
}
