package com.blockout.matches.match.live.report.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.matches.exceptions.MatchNotFoundException;
import com.blockout.shared.model.LiveLinkStatusEnum;
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

    private final MatchLiveLinkReportStore reports;
    private final MatchLiveLinkReportPolicy policy;
    private final Clock clock;

    @Transactional
    public void report(Long matchId, ReportMatchLiveLinkCommand command) {
        MatchLiveLinkReportTarget target = reports.findNewestActive(matchId).orElseThrow(() -> {
            LOGGER.warn("No active live link to report", keyValue("action", "report_live_link"),
                    keyValue("match_id", matchId), keyValue("auth0_id", command.reporterAuth0Id()));
            return new MatchNotFoundException(matchId);
        });

        if (reports.exists(target.liveLinkId(), command.reporterAuth0Id())) {
            LOGGER.info("Live link already reported by this user for this version",
                    keyValue("action", "report_live_link_ignored"),
                    keyValue("live_link_id", target.liveLinkId()), keyValue("match_id", matchId),
                    keyValue("auth0_id", command.reporterAuth0Id()));
            return;
        }

        Instant now = clock.instant();
        reports.create(new NewMatchLiveLinkReport(
                target.liveLinkId(), command.reporterAuth0Id(), command.reason(), now));

        long reportCount = reports.count(target.liveLinkId());
        int threshold = policy.autoHideThreshold(target.matchStatus());
        LiveLinkStatusEnum status = policy.statusAfterReport(target.status(), reportCount, threshold);
        if (status == LiveLinkStatusEnum.BANNED && target.status() == LiveLinkStatusEnum.ACTIVE) {
            LOGGER.info("Live link auto-banned due to reports", keyValue("action", "auto_ban_live_link"),
                    keyValue("live_link_id", target.liveLinkId()), keyValue("match_id", matchId),
                    keyValue("reports_count", reportCount), keyValue("threshold", threshold),
                    keyValue("new_status", status));
        }

        reports.updateTarget(target.liveLinkId(), (int) reportCount, status, now);
        LOGGER.info("Live link reported", keyValue("action", "report_live_link"),
                keyValue("live_link_id", target.liveLinkId()), keyValue("match_id", matchId),
                keyValue("auth0_id", command.reporterAuth0Id()), keyValue("reason", command.reason()),
                keyValue("reports_total", reportCount), keyValue("threshold", threshold),
                keyValue("status_after_report", status));
    }
}
