package com.blockout.notifications.services;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.notifications.delivery.application.NotificationDelivery;
import com.blockout.notifications.delivery.application.NotificationDeliveryCommand;
import com.blockout.notifications.pool.application.PoolCatalog;
import com.blockout.notifications.pool.application.PoolNameSnapshot;
import com.blockout.notifications.team.application.TeamCatalog;
import com.blockout.notifications.team.application.TeamNameSnapshot;
import com.blockout.shared.model.NotificationTypeEnum;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NotificationOrchestratorService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationOrchestratorService.class);

    private final NotificationDelivery delivery;

    private final PoolCatalog poolCatalog;
    private final TeamCatalog teamCatalog;

    /** Delivers a MATCH_FINISHED notification. */
    public void handleMatchFinished(Long matchId, Long teamIdA, Long teamIdB, Long poolId, String set) {
        ResolvedContent content = resolveFinishedContent(matchId, teamIdA, teamIdB, poolId, set);

        delivery.deliver(new NotificationDeliveryCommand(
                matchId,
                teamIdA,
                teamIdB,
                poolId,
                NotificationTypeEnum.MATCH_FINISHED,
                content.title(),
                content.body(),
                content.divisionId()));
    }

    /** Delivers a MATCH_LIVE_LINK_CREATED notification. */
    public void handleMatchLiveLinkCreated(Long matchId, Long teamIdA, Long teamIdB, Long poolId) {
        ResolvedContent content = resolveLiveLinkContent(matchId, teamIdA, teamIdB, poolId);

        delivery.deliver(new NotificationDeliveryCommand(
                matchId,
                teamIdA,
                teamIdB,
                poolId,
                NotificationTypeEnum.MATCH_LIVE_LINK_CREATED,
                content.title(),
                content.body(),
                content.divisionId()));
    }

    // Content resolution

    private ResolvedContent resolveFinishedContent(
            Long matchId,
            Long teamIdA,
            Long teamIdB,
            Long poolId,
            String set) {
        String poolName = "Match terminé";
        Long divisionId = null;
        String teamAName = "Équipe A";
        String teamBName = "Équipe B";

        try {
            PoolNameSnapshot pool = poolCatalog.getById(poolId);
            if (pool != null) {
                if (pool.name() != null && !pool.name().isBlank()) {
                    poolName = pool.name();
                }
                if (pool.divisionId() != null) {
                    divisionId = pool.divisionId();
                }
            }
        } catch (Exception ex) {
            logger.warn("Failed to resolve pool name/logo",
                    keyValue("action", "pool_resolve_failed"),
                    keyValue("matchId", matchId),
                    ex);
        }

        try {
            TeamNameSnapshot ta = teamCatalog.getById(teamIdA);
            if (ta != null && ta.shortName() != null && !ta.shortName().isBlank()) {
                teamAName = ta.shortName();
            }

            TeamNameSnapshot tb = teamCatalog.getById(teamIdB);
            if (tb != null && tb.shortName() != null && !tb.shortName().isBlank()) {
                teamBName = tb.shortName();
            }

        } catch (Exception ex) {
            logger.warn("Failed to resolve team names",
                    keyValue("action", "teams_resolve_failed"),
                    keyValue("matchId", matchId),
                    keyValue("teamIdA", teamIdA),
                    keyValue("teamIdB", teamIdB),
                    ex);
        }

        String scoreText = (set != null && !set.isBlank()) ? set.trim() : "N/A";
        String body = String.format("%s vs %s — Score final : %s", teamAName, teamBName, scoreText);

        return new ResolvedContent(poolName, body, divisionId);
    }

    private ResolvedContent resolveLiveLinkContent(
            Long matchId,
            Long teamIdA,
            Long teamIdB,
            Long poolId) {

        String poolName = "Nouveau live disponible";
        Long divisionId = null;
        String teamAName = "Équipe A";
        String teamBName = "Équipe B";

        try {
            PoolNameSnapshot pool = poolCatalog.getById(poolId);
            if (pool != null) {
                if (pool.name() != null && !pool.name().isBlank()) {
                    poolName = pool.name();
                }
                if (pool.divisionId() != null) {
                    divisionId = pool.divisionId();
                }
            }
        } catch (Exception ex) {
            logger.warn("Failed to resolve pool name for live link",
                    keyValue("action", "pool_resolve_failed_live_link"),
                    keyValue("matchId", matchId),
                    ex);
        }

        try {
            TeamNameSnapshot ta = teamCatalog.getById(teamIdA);
            if (ta != null && ta.shortName() != null && !ta.shortName().isBlank()) {
                teamAName = ta.shortName();
            }

            TeamNameSnapshot tb = teamCatalog.getById(teamIdB);
            if (tb != null && tb.shortName() != null && !tb.shortName().isBlank()) {
                teamBName = tb.shortName();
            }

        } catch (Exception ex) {
            logger.warn("Failed to resolve team names for live link",
                    keyValue("action", "teams_resolve_failed_live_link"),
                    keyValue("matchId", matchId),
                    keyValue("teamIdA", teamIdA),
                    keyValue("teamIdB", teamIdB),
                    ex);
        }

        String title = poolName;

        String body = String.format(
                "🔴 Le match %s vs %s est en live ! Clique pour regarder",
                teamAName,
                teamBName);

        return new ResolvedContent(title, body, divisionId);
    }

    /** Carries resolved notification copy and division context. */
    private record ResolvedContent(String title, String body, Long divisionId) {
    }
}
