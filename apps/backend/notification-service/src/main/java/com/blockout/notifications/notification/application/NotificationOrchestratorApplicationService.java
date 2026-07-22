package com.blockout.notifications.notification.application;

import com.blockout.notifications.notification.application.models.NotificationTargetType;
import com.blockout.notifications.notification.application.models.NotificationType;
import com.blockout.notifications.notification.application.views.ResolvedPushTokensPage;
import com.blockout.notifications.notification.application.views.PoolNotificationView;
import com.blockout.notifications.notification.application.views.TeamNotificationView;
import com.blockout.notifications.notification.infrastructure.http.PoolHttpClient;
import com.blockout.notifications.notification.infrastructure.http.TeamHttpClient;
import com.blockout.notifications.notification.infrastructure.persistence.entities.UserNotificationEntity;
import com.blockout.notifications.notification.infrastructure.providers.expo.ExpoBatchResult;
import com.blockout.notifications.notification.infrastructure.providers.expo.ExpoMessage;
import com.blockout.notifications.notification.infrastructure.providers.expo.ExpoPushProvider;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class NotificationOrchestratorApplicationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationOrchestratorApplicationService.class);
    private static final int RESOLVE_PAGE_SIZE = 2_000;
    private static final int EXPO_BATCH_SIZE = 100;
    private final NotificationSendApplicationService notificationSendService;
    private final ExpoPushProvider expoPushService;
    private final UserNotificationApplicationService userNotificationService;
    private final PushTokenApplicationService pushTokenService;
    private final PoolHttpClient poolClientService;
    private final TeamHttpClient teamClientService;
    private final ObjectMapper objectMapper;

    /**
     * Match terminé -> notif "MATCH_FINISHED".
     */
    public void handleMatchFinished(Long matchId, Long teamIdA, Long teamIdB, Long poolId, String set) {
        ResolvedContent content = resolveFinishedContent(matchId, teamIdA, teamIdB, poolId, set);

        ObjectNode baseMetadata = objectMapper.createObjectNode()
            .put("divisionId", content.divisionId());

        // Réservation typée MATCH_FINISHED
        List<Long> reservedUserIds = notificationSendService
            .reservePendingForMatchFinished(matchId, teamIdA, teamIdB, poolId);

        processNotificationPipeline(
            matchId,
            reservedUserIds,
            NotificationType.MATCH_FINISHED,
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
        List<Long> reservedUserIds = notificationSendService
            .reservePendingForMatchLiveLinkCreated(matchId, teamIdA, teamIdB, poolId);

        processNotificationPipeline(
            matchId,
            reservedUserIds,
            NotificationType.MATCH_LIVE_LINK_CREATED,
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
        NotificationType notificationType,
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
            keyValue("expoBatchSize", EXPO_BATCH_SIZE));

        // 1) Inbox notifications
        List<UserNotificationEntity> bulk = new ArrayList<>(reservedUserIds.size());
        for (Long userId : reservedUserIds) {
            JsonNode meta = baseMetadata.deepCopy();
            bulk.add(UserNotificationEntity.builder()
                .userId(userId)
                .type(notificationType)
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

            ResolvedPushTokensPage page = pushTokenService.resolveTokensPage(pageUserIds);

            if (!page.getNoTokenUserIds().isEmpty()) {
                notificationSendService.markSent(matchId, page.getNoTokenUserIds(), true);
            }

            List<ExpoMessage> messages = new ArrayList<>();
            if (page.getTokensByUser() != null && !page.getTokensByUser().isEmpty()) {
                for (Map.Entry<Long, List<String>> e : page.getTokensByUser().entrySet()) {
                    Long userId = e.getKey();
                    List<String> tokens = e.getValue() == null ? List.of()
                        : e.getValue().stream().distinct().toList();

                    for (String token : tokens) {
                        messages.add(ExpoMessage.builder()
                            .to(token)
                            .title(content.title())
                            .body(content.body())
                            .userId(userId)
                            .matchId(matchId)
                            .data(Map.of("url", "blockout://match/" + matchId))
                            .build());
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
                List<ExpoMessage> batch = messages.subList(i, end);

                try {
                    ExpoBatchResult result = expoPushService.sendBatch(batch);

                    if (result.getUserIdsOk() != null) {
                        usersSent.addAll(result.getUserIdsOk());
                    }
                    if (result.getUserIdsFailed() != null) {
                        usersFailed.addAll(result.getUserIdsFailed());
                    }
                    if (result.getInvalidTokens() != null) {
                        invalidTokens.addAll(result.getInvalidTokens());
                    }

                    logger.info("Expo batch done",
                        keyValue("action", "expo_batch_done_" + logContext),
                        keyValue("matchId", matchId),
                        keyValue("pageIndex", pageIndex),
                        keyValue("batchIndex", batchIndex),
                        keyValue("batchSize", batch.size()),
                        keyValue("okUsers",
                            result.getUserIdsOk() != null ? result.getUserIdsOk().size() : 0),
                        keyValue("failedUsers",
                            result.getUserIdsFailed() != null ? result.getUserIdsFailed().size() : 0),
                        keyValue("invalidTokens",
                            result.getInvalidTokens() != null ? result.getInvalidTokens().size() : 0));

                } catch (Exception ex) {
                    Set<Long> batchUsers = batch.stream()
                        .map(ExpoMessage::getUserId)
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
                notificationSendService.markSent(matchId, usersSent, false);
            }
            if (!usersFailed.isEmpty()) {
                notificationSendService.markFailed(matchId, usersFailed, "EXPO_SEND_ERROR", "See logs for details");
            }
            if (!invalidTokens.isEmpty()) {
                pushTokenService.deactivateByTokens(invalidTokens.stream().distinct().toList());
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
            PoolNotificationView pool = poolClientService.getPoolById(poolId);
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
            TeamNotificationView ta = teamClientService.getTeamById(teamIdA);
            if (ta != null && ta.shortName() != null && !ta.shortName().isBlank()) {
                teamAName = ta.shortName();
            }

            TeamNotificationView tb = teamClientService.getTeamById(teamIdB);
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
            PoolNotificationView pool = poolClientService.getPoolById(poolId);
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
            TeamNotificationView ta = teamClientService.getTeamById(teamIdA);
            if (ta != null && ta.shortName() != null && !ta.shortName().isBlank()) {
                teamAName = ta.shortName();
            }

            TeamNotificationView tb = teamClientService.getTeamById(teamIdB);
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

    /**
     * Petite record interne pour transporter titre+corps+divisionId
     */
    private record ResolvedContent(String title, String body, Long divisionId) {
    }
}
