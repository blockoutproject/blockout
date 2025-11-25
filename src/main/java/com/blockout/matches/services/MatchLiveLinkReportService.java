package com.blockout.matches.services;

import com.blockout.matches.exceptions.MatchNotFoundException;
import com.blockout.matches.models.dto.match.MatchLiveLinkReportRequestDTO;
import com.blockout.matches.models.entities.Match;
import com.blockout.matches.models.entities.MatchLiveLink;
import com.blockout.matches.models.entities.MatchLiveLinkReport;
import com.blockout.matches.models.enums.LiveLinkStatus;
import com.blockout.matches.models.enums.MatchStatus;
import com.blockout.matches.repositories.MatchLiveLinkReportRepository;
import com.blockout.matches.repositories.MatchLiveLinkRepository;
import com.blockout.matches.repositories.MatchRepository;
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

    private static final Logger logger = LoggerFactory.getLogger(MatchLiveLinkService.class);

    private static final int AUTO_HIDE_THRESHOLD = 3;
    private static final int FINAL_AUTO_HIDE_THRESHOLD = 10;

    private final MatchRepository matchRepository;
    private final MatchLiveLinkRepository liveLinkRepository;
    private final MatchLiveLinkReportRepository liveLinkReportRepository;

    /**
     * Signale le lien de live actif d’un match. Un utilisateur ne peut signaler
     * qu’une seule fois une version donnée du lien. Chaque signalement incrémente
     * le nombre total de reports et peut entraîner un masquage automatique.
     *
     * <p>
     * Comportement général :
     * </p>
     * <ul>
     * <li>Le signalement porte toujours sur la version active du lien,
     * récupérée par
     * {@code findFirstByMatchIdAndStatusOrderByCreatedAtDesc(...)}.</li>
     *
     * <li>Si l’utilisateur a déjà signalé cette version, l’appel est ignoré
     * silencieusement et simplement consigné dans les logs.</li>
     *
     * <li>Chaque signalement crée une entrée {@link MatchLiveLinkReport} et met
     * à jour le {@code reportCount} du lien actif.</li>
     *
     * <li>Un seuil de masquage automatique est appliqué :
     * <ul>
     * <li>{@link #AUTO_HIDE_THRESHOLD} (3) pour les liens classiques
     * (pendant ou avant le match),</li>
     * <li>{@link #FINAL_AUTO_HIDE_THRESHOLD} (10) pour les liens
     * finaux de rediffusion (match terminé et verrouillé).</li>
     * </ul>
     * Si le seuil est atteint ou dépassé, le lien actif est marqué
     * comme {@link LiveLinkStatus#HIDDEN}.</li>
     *
     * <li>Le masquage automatique désactive immédiatement le lien,
     * empêchant son apparition dans le front pour tous les utilisateurs.</li>
     * </ul>
     *
     * @param matchId identifiant du match dont on signale le lien actif
     * @param request motif du signalement
     * @param auth0Id identifiant Auth0 de l’utilisateur ayant effectué le
     *                signalement
     *
     * @throws MatchNotFoundException si aucun lien actif n’existe pour le match.
     */
    @Transactional
    public void reportLiveLink(Long matchId, MatchLiveLinkReportRequestDTO request, String auth0Id) {
        MatchLiveLink liveLink = liveLinkRepository
                .findFirstByMatchIdAndStatusOrderByCreatedAtDesc(matchId, LiveLinkStatus.ACTIVE)
                .orElseThrow(() -> {
                    logger.warn("No active live link to report",
                            keyValue("action", "report_live_link"),
                            keyValue("match_id", matchId),
                            keyValue("auth0_id", auth0Id));
                    return new MatchNotFoundException(matchId);
                });

        if (liveLinkReportRepository.existsByLiveLinkIdAndReporterAuth0Id(liveLink.getId(), auth0Id)) {
            logger.info("Live link already reported by this user for this version",
                    keyValue("action", "report_live_link_ignored"),
                    keyValue("live_link_id", liveLink.getId()),
                    keyValue("match_id", matchId),
                    keyValue("auth0_id", auth0Id));
            return;
        }

        MatchLiveLinkReport report = MatchLiveLinkReport.builder()
                .liveLinkId(liveLink.getId())
                .reporterAuth0Id(auth0Id)
                .reason(request.getReason())
                .createdAt(Instant.now())
                .build();

        liveLinkReportRepository.save(report);

        long reportsCount = liveLinkReportRepository.countByLiveLinkId(liveLink.getId());
        liveLink.setReportCount((int) reportsCount);

        Match match = matchRepository.findById(matchId).orElse(null);
        int threshold = AUTO_HIDE_THRESHOLD;
        if (match != null && match.getStatus() == MatchStatus.FINISHED && match.isLiveEditLocked()) {
            threshold = FINAL_AUTO_HIDE_THRESHOLD;
        }

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