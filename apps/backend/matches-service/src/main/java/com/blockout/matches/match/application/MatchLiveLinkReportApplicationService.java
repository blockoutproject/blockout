package com.blockout.matches.match.application;

import com.blockout.matches.match.application.exceptions.MatchNotFoundException;
import com.blockout.matches.match.application.models.LiveLinkStatus;
import com.blockout.matches.match.infrastructure.persistence.entities.MatchEntity;
import com.blockout.matches.match.infrastructure.persistence.entities.MatchLiveLinkEntity;
import com.blockout.matches.match.infrastructure.persistence.entities.MatchLiveLinkReportEntity;
import com.blockout.matches.match.infrastructure.persistence.repositories.MatchLiveLinkReportRepository;
import com.blockout.matches.match.infrastructure.persistence.repositories.MatchLiveLinkRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class MatchLiveLinkReportApplicationService implements MatchLiveLinkReportService {

    private static final Logger LOGGER = LoggerFactory.getLogger(MatchLiveLinkReportApplicationService.class);

    private final MatchLiveLinkRepository liveLinkRepository;
    private final MatchLiveLinkReportRepository reportRepository;
    private final MatchLiveLinkModerationPolicy moderationPolicy;

    @Override
    @Transactional
    public void reportLiveLink(Long matchId, String reason, String auth0Id) {
        MatchLiveLinkEntity liveLink = liveLinkRepository
                .findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatus.ACTIVE)
                .orElseThrow(() -> new MatchNotFoundException(matchId));
        if (reportRepository.existsByLiveLink_IdAndReporterAuth0Id(liveLink.getId(), auth0Id)) {
            LOGGER.info("Ignored duplicate live link report",
                    keyValue("action", "report_live_link_ignored"), keyValue("liveLinkId", liveLink.getId()));
            return;
        }

        reportRepository.save(MatchLiveLinkReportEntity.builder()
                .liveLink(liveLink)
                .reporterAuth0Id(auth0Id)
                .reason(reason)
                .createdAt(Instant.now())
                .build());
        long reportCount = reportRepository.countByLiveLink_Id(liveLink.getId());
        liveLink.setReportCount((int) reportCount);
        MatchEntity match = liveLink.getMatch();
        int threshold = moderationPolicy.determineAutoHideThreshold(match);
        if (reportCount >= threshold && liveLink.getStatus() == LiveLinkStatus.ACTIVE) {
            liveLink.setStatus(LiveLinkStatus.BANNED);
        }
        liveLinkRepository.saveAndFlush(liveLink);
        LOGGER.info("Reported live link", keyValue("action", "report_live_link"),
                keyValue("matchId", matchId), keyValue("liveLinkId", liveLink.getId()),
                keyValue("reportCount", reportCount), keyValue("threshold", threshold));
    }
}
