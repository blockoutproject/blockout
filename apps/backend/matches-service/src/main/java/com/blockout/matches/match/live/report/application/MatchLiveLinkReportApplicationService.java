package com.blockout.matches.match.live.report.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.matches.exceptions.MatchNotFoundException;
import com.blockout.matches.match.live.report.persistence.MatchLiveLinkReportPersistenceMapper;
import com.blockout.matches.match.persistence.Match;
import com.blockout.matches.match.persistence.MatchRepository;
import com.blockout.matches.models.entities.MatchLiveLink;
import com.blockout.matches.models.entities.MatchLiveLinkReport;
import com.blockout.matches.models.enums.LiveLinkStatus;
import com.blockout.matches.repositories.MatchLiveLinkReportRepository;
import com.blockout.matches.repositories.MatchLiveLinkRepository;
import com.blockout.matches.services.moderation.MatchLiveLinkModerationPolicy;
import java.time.Clock;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MatchLiveLinkReportApplicationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(MatchLiveLinkReportApplicationService.class);

    private final MatchRepository matches;
    private final MatchLiveLinkRepository liveLinks;
    private final MatchLiveLinkReportRepository reports;
    private final MatchLiveLinkModerationPolicy moderationPolicy;
    private final MatchLiveLinkReportPersistenceMapper mapper;
    private final Clock clock;

    @Transactional
    public void report(Long matchId, ReportMatchLiveLinkCommand command) {
        MatchLiveLink liveLink = liveLinks
                .findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatus.ACTIVE)
                .orElseThrow(() -> {
                    LOGGER.warn("No active live link to report", keyValue("action", "report_live_link"),
                            keyValue("match_id", matchId), keyValue("auth0_id", command.reporterAuth0Id()));
                    return new MatchNotFoundException(matchId);
                });

        if (reports.existsByLiveLink_IdAndReporterAuth0Id(liveLink.getId(), command.reporterAuth0Id())) {
            LOGGER.info("Live link already reported by this user for this version",
                    keyValue("action", "report_live_link_ignored"),
                    keyValue("live_link_id", liveLink.getId()), keyValue("match_id", matchId),
                    keyValue("auth0_id", command.reporterAuth0Id()));
            return;
        }

        Instant now = clock.instant();
        MatchLiveLinkReport report = mapper.toNewEntity(liveLink, command, now);
        reports.save(report);

        long reportCount = reports.countByLiveLink_Id(liveLink.getId());
        liveLink.setReportCount((int) reportCount);
        Match match = liveLink.getMatch();
        if (match == null) {
            match = matches.findById(matchId).orElse(null);
        }
        int threshold = moderationPolicy.determineAutoHideThreshold(match);
        if (reportCount >= threshold && liveLink.getStatus() == LiveLinkStatus.ACTIVE) {
            liveLink.setStatus(LiveLinkStatus.BANNED);
            LOGGER.info("Live link auto-banned due to reports", keyValue("action", "auto_ban_live_link"),
                    keyValue("live_link_id", liveLink.getId()), keyValue("match_id", matchId),
                    keyValue("reports_count", reportCount), keyValue("threshold", threshold),
                    keyValue("new_status", liveLink.getStatus()));
        }

        liveLink.setLastUpdate(now);
        liveLinks.save(liveLink);
        LOGGER.info("Live link reported", keyValue("action", "report_live_link"),
                keyValue("live_link_id", liveLink.getId()), keyValue("match_id", matchId),
                keyValue("auth0_id", command.reporterAuth0Id()), keyValue("reason", command.reason()),
                keyValue("reports_total", reportCount), keyValue("threshold", threshold),
                keyValue("status_after_report", liveLink.getStatus()));
    }
}
