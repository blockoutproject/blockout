package com.blockout.matches.services;

import com.blockout.matches.exceptions.MatchNotFoundException;
import com.blockout.matches.models.dto.match.MatchLiveLinkReportRequestDTO;
import com.blockout.matches.models.entities.Match;
import com.blockout.matches.models.entities.MatchLiveLink;
import com.blockout.matches.models.entities.MatchLiveLinkReport;
import com.blockout.matches.models.enums.LiveLinkStatus;
import com.blockout.matches.repositories.MatchLiveLinkReportRepository;
import com.blockout.matches.repositories.MatchLiveLinkRepository;
import com.blockout.matches.repositories.MatchRepository;
import com.blockout.matches.services.moderation.MatchLiveLinkModerationPolicy;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class MatchLiveLinkReportService {

    private static final Logger logger = LoggerFactory.getLogger(MatchLiveLinkReportService.class);

    private final MatchRepository matchRepository;
    private final MatchLiveLinkRepository liveLinkRepository;
    private final MatchLiveLinkReportRepository liveLinkReportRepository;
    private final MatchLiveLinkModerationPolicy moderationPolicy;

    /**
     * Signale le lien actif d'un match et applique éventuellement un auto-hide.
     */
    @Transactional
    public void reportLiveLink(Long matchId, MatchLiveLinkReportRequestDTO request, String auth0Id) {
        // On ne peut reporter que le lien actif
        MatchLiveLink liveLink = liveLinkRepository
                .findFirstByMatchIdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatus.ACTIVE)
                .orElseThrow(() -> {
                    logger.warn("No active live link to report",
                            keyValue("action", "report_live_link"),
                            keyValue("match_id", matchId),
                            keyValue("auth0_id", auth0Id));
                    return new MatchNotFoundException(matchId);
                });

        // Un user ne peut reporter qu'une version donnée du lien une seule fois
        if (liveLinkReportRepository.existsByLiveLinkIdAndReporterAuth0Id(liveLink.getId(), auth0Id)) {
            logger.info("Live link already reported by this user for this version",
                    keyValue("action", "report_live_link_ignored"),
                    keyValue("live_link_id", liveLink.getId()),
                    keyValue("match_id", matchId),
                    keyValue("auth0_id", auth0Id));
            return;
        }

        // On enregistre le report
        MatchLiveLinkReport report = MatchLiveLinkReport.builder()
                .liveLinkId(liveLink.getId())
                .reporterAuth0Id(auth0Id)
                .reason(request.getReason())
                .createdAt(Instant.now())
                .build();

        liveLinkReportRepository.save(report);

        // Recalcul du nombre total de reports pour ce lien
        long reportsCount = liveLinkReportRepository.countByLiveLinkId(liveLink.getId());
        liveLink.setReportCount((int) reportsCount);

        Match match = matchRepository.findById(matchId).orElse(null);

        // Seuil dynamique (live vs rediff finale figée)
        int threshold = moderationPolicy.determineAutoHideThreshold(match);

        // Auto-hide si seuil atteint
        if (reportsCount >= threshold && liveLink.getStatus() == LiveLinkStatus.ACTIVE) {
            liveLink.setStatus(LiveLinkStatus.HIDDEN);
            logger.info("Live link auto-hidden due to reports",
                    keyValue("action", "auto_hide_live_link"),
                    keyValue("live_link_id", liveLink.getId()),
                    keyValue("match_id", matchId),
                    keyValue("reports_count", reportsCount),
                    keyValue("threshold", threshold));
        }

        liveLink.setLastUpdate(Instant.now());
        liveLinkRepository.save(liveLink);

        logger.info("Live link reported",
                keyValue("action", "report_live_link"),
                keyValue("live_link_id", liveLink.getId()),
                keyValue("match_id", matchId),
                keyValue("auth0_id", auth0Id),
                keyValue("reason", request.getReason()),
                keyValue("reports_total", reportsCount),
                keyValue("threshold", threshold));
    }
}