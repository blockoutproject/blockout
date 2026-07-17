package com.blockout.notifications.services;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.blockout.notifications.delivery.application.DeliveryBatchResult;
import com.blockout.notifications.delivery.application.DeliveryLedger;
import com.blockout.notifications.delivery.application.DeliveryMessage;
import com.blockout.notifications.delivery.application.DeliveryTokenCatalog;
import com.blockout.notifications.delivery.application.DeliveryTokenPage;
import com.blockout.notifications.delivery.application.PushDeliveryProvider;
import com.blockout.notifications.pool.application.PoolCatalog;
import com.blockout.notifications.pool.application.PoolNameSnapshot;
import com.blockout.notifications.models.entity.UserNotification;
import com.blockout.notifications.models.enums.NotificationTargetType;
import com.blockout.notifications.models.enums.NotificationType;
import com.blockout.shared.model.NotificationTypeEnum;
import com.blockout.notifications.team.application.TeamCatalog;
import com.blockout.notifications.team.application.TeamNameSnapshot;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class NotificationOrchestratorService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationOrchestratorService.class);

    private final DeliveryLedger deliveryLedger;
    private final PushDeliveryProvider pushDeliveryProvider;
    private final UserNotificationService userNotificationService;
    private final DeliveryTokenCatalog deliveryTokenCatalog;

    private final PoolCatalog poolCatalog;
    private final TeamCatalog teamCatalog;

    private final ObjectMapper objectMapper;

    private static final int RESOLVE_PAGE_SIZE = 2_000;
    private static final int EXPO_BATCH_SIZE = 100;

    /**
     * Match terminé -> notif "MATCH_FINISHED".
     */
    public void handleMatchFinished(Long matchId, Long teamIdA, Long teamIdB, Long poolId, String set) {
        ResolvedContent content = resolveFinishedContent(matchId, teamIdA, teamIdB, poolId, set);

        ObjectNode baseMetadata = objectMapper.createObjectNode()
                .put("divisionId", content.divisionId());

        // Réservation typée MATCH_FINISHED
        List<Long> reservedUserIds = deliveryLedger
                .reserve(matchId, teamIdA, teamIdB, poolId, NotificationTypeEnum.MATCH_FINISHED);

        processNotificationPipeline(
                matchId,
                reservedUserIds,
                NotificationTypeEnum.MATCH_FINISHED,
                content,
                baseMetadata,
                "match_finished");
    }

    /**
     * Nouveau lien de live (avant / pendant match) -> notif
     * "MATCH_LIVE_LINK_CREATED".
     */
    public void handleMatchLiveLinkCreated(Long matchId, Long teamIdA, Long teamIdB, Long poolId) {
        ResolvedContent content = resolveLiveLinkContent(matchId, teamIdA, teamIdB, poolId);

        ObjectNode baseMetadata = objectMapper.createObjectNode()
                .put("divisionId", content.divisionId());

        // Réservation typée MATCH_LIVE_LINK_CREATED
        List<Long> reservedUserIds = deliveryLedger
                .reserve(matchId, teamIdA, teamIdB, poolId, NotificationTypeEnum.MATCH_LIVE_LINK_CREATED);

        processNotificationPipeline(
                matchId,
                reservedUserIds,
                NotificationTypeEnum.MATCH_LIVE_LINK_CREATED,
                content,
                baseMetadata,
                "match_live_link_created");
    }

    /**
     * Pipeline générique : inbox + résolution tokens + push Expo + markSent/Failed.
     */
    private void processNotificationPipeline(
            Long matchId,
            List<Long> reservedUserIds,
            NotificationTypeEnum notificationType,
            ResolvedContent content,
            ObjectNode baseMetadata,
            String logContext) {
        if (reservedUserIds == null || reservedUserIds.isEmpty()) {
            logger.info("No recipients reserved",
                    keyValue("action", "notification_reserve_empty_" + logContext),
                    keyValue("matchId", matchId));
            return;
        }

        logger.info("Starting token resolution & push",
                keyValue("action", "notification_push_start_" + logContext),
                keyValue("matchId", matchId),
                keyValue("reservedCount", reservedUserIds.size()),
                keyValue("resolvePageSize", RESOLVE_PAGE_SIZE),
                keyValue("expoBatchSize", EXPO_BATCH_SIZE),
                keyValue("title", content.title()),
                keyValue("body", content.body()));

        // 1) Inbox notifications
        List<UserNotification> bulk = new ArrayList<>(reservedUserIds.size());
        for (Long userId : reservedUserIds) {
            JsonNode meta = baseMetadata.deepCopy();
            bulk.add(UserNotification.builder()
                    .userId(userId)
                    .type(NotificationType.valueOf(notificationType.name()))
                    .title(content.title())
                    .body(content.body())
                    .deepLink("/match/" + matchId)
                    .targetType(NotificationTargetType.MATCH)
                    .targetId(matchId)
                    .metadata(meta)
                    .isRead(false)
                    .isOpened(false)
                    .createdAt(Instant.now())
                    .build());
        }
        userNotificationService.createNotificationsBatch(bulk);

        logger.info("User notifications created",
                keyValue("action", "user_notifications_created_" + logContext),
                keyValue("matchId", matchId),
                keyValue("count", reservedUserIds.size()));

        // 2) Pagination des users pour résolution des tokens & push Expo
        int pageIndex = 0;
        for (int from = 0; from < reservedUserIds.size(); from += RESOLVE_PAGE_SIZE, pageIndex++) {
            int to = Math.min(from + RESOLVE_PAGE_SIZE, reservedUserIds.size());
            List<Long> pageUserIds = reservedUserIds.subList(from, to);

            DeliveryTokenPage page = deliveryTokenCatalog.resolvePage(pageUserIds);

            if (!page.noTokenUserIds().isEmpty()) {
                deliveryLedger.markNoToken(matchId, page.noTokenUserIds());
            }

            List<DeliveryMessage> messages = new ArrayList<>();
            if (!page.tokensByUser().isEmpty()) {
                for (Map.Entry<Long, List<String>> e : page.tokensByUser().entrySet()) {
                    Long userId = e.getKey();
                    List<String> tokens = e.getValue() == null ? List.of()
                            : e.getValue().stream().distinct().toList();

                    for (String token : tokens) {
                        messages.add(new DeliveryMessage(
                                token,
                                content.title(),
                                content.body(),
                                Map.of("url", "blockout://match/" + matchId),
                                userId,
                                matchId));
                    }
                }
            }

            logger.info("Resolve page built",
                    keyValue("action", "notification_resolve_page_" + logContext),
                    keyValue("matchId", matchId),
                    keyValue("pageIndex", pageIndex),
                    keyValue("pageSize", pageUserIds.size()),
                    keyValue("messageCount", messages.size()));

            Set<Long> usersSent = new LinkedHashSet<>();
            Set<Long> usersFailed = new LinkedHashSet<>();
            List<String> invalidTokens = new ArrayList<>();

            int batchIndex = 0;
            for (int i = 0; i < messages.size(); i += EXPO_BATCH_SIZE, batchIndex++) {
                int end = Math.min(i + EXPO_BATCH_SIZE, messages.size());
                List<DeliveryMessage> batch = messages.subList(i, end);

                try {
                    DeliveryBatchResult result = pushDeliveryProvider.sendBatch(batch);

                    usersSent.addAll(result.successfulUserIds());
                    usersFailed.addAll(result.failedUserIds());
                    invalidTokens.addAll(result.invalidTokens());

                    logger.info("Expo batch done",
                            keyValue("action", "expo_batch_done_" + logContext),
                            keyValue("matchId", matchId),
                            keyValue("pageIndex", pageIndex),
                            keyValue("batchIndex", batchIndex),
                            keyValue("batchSize", batch.size()),
                            keyValue("okUsers",
                                    result.successfulUserIds().size()),
                            keyValue("failedUsers",
                                    result.failedUserIds().size()),
                            keyValue("invalidTokens",
                                    result.invalidTokens().size()));

                } catch (Exception ex) {
                    Set<Long> batchUsers = batch.stream()
                            .map(DeliveryMessage::userId)
                            .collect(Collectors.toCollection(LinkedHashSet::new));
                    usersFailed.addAll(batchUsers);

                    logger.error("Expo batch send failed",
                            keyValue("action", "expo_batch_failed_" + logContext),
                            keyValue("matchId", matchId),
                            keyValue("pageIndex", pageIndex),
                            keyValue("batchIndex", batchIndex),
                            keyValue("batchSize", batch.size()),
                            ex);
                }
            }

            if (!usersSent.isEmpty()) {
                deliveryLedger.markSent(matchId, usersSent);
            }
            if (!usersFailed.isEmpty()) {
                deliveryLedger.markFailed(matchId, usersFailed, "EXPO_SEND_ERROR", "See logs for details");
            }
            if (!invalidTokens.isEmpty()) {
                deliveryTokenCatalog.deactivateInvalidTokens(invalidTokens.stream().distinct().toList());
            }

            logger.info("Resolve+push page done",
                    keyValue("action", "notification_page_done_" + logContext),
                    keyValue("matchId", matchId),
                    keyValue("pageIndex", pageIndex),
                    keyValue("pageUsers", pageUserIds.size()),
                    keyValue("sentUsers", usersSent.size()),
                    keyValue("failedUsers", usersFailed.size()));
        }

        logger.info("Push pipeline completed",
                keyValue("action", "notification_push_done_" + logContext),
                keyValue("matchId", matchId),
                keyValue("time", Instant.now()));
    }

    // -----------------------------------------------------------------------------------------------------------------
    // Résolution du contenu
    // -----------------------------------------------------------------------------------------------------------------

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

    /** Petite record interne pour transporter titre+corps+divisionId */
    private record ResolvedContent(String title, String body, Long divisionId) {
    }
}
