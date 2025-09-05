package com.blockout.notifications.services;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.blockout.notifications.models.UserNotification;
import com.blockout.notifications.models.dto.ResolvePage;
import com.blockout.notifications.models.dto.expo.ExpoBatchResult;
import com.blockout.notifications.models.dto.expo.ExpoMessage;
import com.blockout.notifications.models.dto.pool.PoolDTO;
import com.blockout.notifications.models.dto.team.TeamDTO;
import com.blockout.notifications.models.enums.NotificationTargetType;
import com.blockout.notifications.models.enums.NotificationType;
import com.blockout.notifications.services.clients.PoolClientService;
import com.blockout.notifications.services.clients.TeamClientService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class NotificationOrchestratorService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationOrchestratorService.class);

    private final NotificationSendService notificationSendService;
    private final ExpoPushService expoPushService;
    private final UserNotificationService userNotificationService;
    private final PushTokenService pushTokenService;

    private final PoolClientService poolClientService;
    private final TeamClientService teamClientService;

    // ⬇️ Injecte Jackson pour construire les metadatas JSON
    private final ObjectMapper objectMapper;

    private static final int RESOLVE_PAGE_SIZE = 2_000;
    private static final int EXPO_BATCH_SIZE = 100;

    public void handleMatchFinished(Long matchId, Long teamIdA, Long teamIdB, Long poolId, String setInfo) {

        final ResolvedContent content = resolveContent(matchId, teamIdA, teamIdB, poolId, setInfo);

        final ObjectNode baseMetadata = objectMapper.createObjectNode()
                .put("divisionId", content.divisionId());

        List<Long> reservedUserIds = notificationSendService.reservePendingForMatch(matchId, teamIdA, teamIdB, poolId);
        if (reservedUserIds.isEmpty()) {
            logger.info("No recipients reserved",
                    keyValue("action", "notification_reserve_empty"),
                    keyValue("matchId", matchId));
            return;
        }

        logger.info("Starting token resolution & push",
                keyValue("action", "notification_push_start"),
                keyValue("matchId", matchId),
                keyValue("reservedCount", reservedUserIds.size()),
                keyValue("resolvePageSize", RESOLVE_PAGE_SIZE),
                keyValue("expoBatchSize", EXPO_BATCH_SIZE),
                keyValue("title", content.title),
                keyValue("body", content.body));

        // ⬇️ Crée les notifications DB, en posant metadata
        List<UserNotification> bulk = new ArrayList<>(reservedUserIds.size());
        for (Long userId : reservedUserIds) {
            JsonNode meta = baseMetadata.deepCopy(); // évite de réutiliser la même instance mutable
            bulk.add(UserNotification.builder()
                    .userId(userId)
                    .type(NotificationType.MATCH_FINISHED)
                    .title(content.title)
                    .body(content.body)
                    .deepLink("/matches/" + matchId)
                    .targetType(NotificationTargetType.MATCH)
                    .targetId(matchId)
                    .metadata(meta)
                    .isRead(false)
                    .isOpened(false)
                    .createdAt(LocalDateTime.now())
                    .build());
        }
        userNotificationService.createNotificationsBatch(bulk);

        logger.info("User notifications created",
                keyValue("action", "user_notifications_created"),
                keyValue("matchId", matchId),
                keyValue("count", reservedUserIds.size()));

        int pageIndex = 0;
        for (int from = 0; from < reservedUserIds.size(); from += RESOLVE_PAGE_SIZE, pageIndex++) {
            int to = Math.min(from + RESOLVE_PAGE_SIZE, reservedUserIds.size());
            List<Long> pageUserIds = reservedUserIds.subList(from, to);

            ResolvePage page = pushTokenService.resolveTokensPage(pageUserIds);

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
                                .title(content.title)
                                .body(content.body)
                                .userId(userId)
                                .matchId(matchId)
                                .build());
                    }
                }
            }

            logger.info("Resolve page built",
                    keyValue("action", "notification_resolve_page"),
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

                    if (result.getUserIdsOk() != null)
                        usersSent.addAll(result.getUserIdsOk());
                    if (result.getUserIdsFailed() != null)
                        usersFailed.addAll(result.getUserIdsFailed());
                    if (result.getInvalidTokens() != null)
                        invalidTokens.addAll(result.getInvalidTokens());

                    logger.info("Expo batch done",
                            keyValue("action", "expo_batch_done"),
                            keyValue("matchId", matchId),
                            keyValue("pageIndex", pageIndex),
                            keyValue("batchIndex", batchIndex),
                            keyValue("batchSize", batch.size()),
                            keyValue("okUsers", result.getUserIdsOk() != null ? result.getUserIdsOk().size() : 0),
                            keyValue("failedUsers",
                                    result.getUserIdsFailed() != null ? result.getUserIdsFailed().size() : 0),
                            keyValue("invalidTokens",
                                    result.getInvalidTokens() != null ? result.getInvalidTokens().size() : 0));

                } catch (Exception ex) {
                    Set<Long> batchUsers = batch.stream().map(ExpoMessage::getUserId)
                            .collect(Collectors.toCollection(LinkedHashSet::new));
                    usersFailed.addAll(batchUsers);

                    logger.error("Expo batch send failed",
                            keyValue("action", "expo_batch_failed"),
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
                    keyValue("action", "notification_page_done"),
                    keyValue("matchId", matchId),
                    keyValue("pageIndex", pageIndex),
                    keyValue("pageUsers", pageUserIds.size()),
                    keyValue("sentUsers", usersSent.size()),
                    keyValue("failedUsers", usersFailed.size()));
        }

        logger.info("Push pipeline completed",
                keyValue("action", "notification_push_done"),
                keyValue("matchId", matchId),
                keyValue("time", LocalDateTime.now()));
    }

    private ResolvedContent resolveContent(Long matchId, Long teamIdA, Long teamIdB, Long poolId, String setInfo) {
        String poolName = "Match terminé";
        Long divisionId = null;
        String teamAName = "Équipe A";
        String teamBName = "Équipe B";

        try {
            PoolDTO pool = poolClientService.getPoolById(poolId);
            if (pool != null) {
                if (pool.getName() != null && !pool.getName().isBlank()) {
                    poolName = pool.getName();
                }
                if (pool.getDivisionId() != null) {
                    divisionId = pool.getDivisionId();
                }
            }
        } catch (Exception ex) {
            logger.warn("Failed to resolve pool name/logo",
                    keyValue("action", "pool_resolve_failed"),
                    keyValue("matchId", matchId),
                    ex);
        }

        try {
            TeamDTO ta = teamClientService.getTeamById(teamIdA);
            if (ta != null && ta.getName() != null && !ta.getName().isBlank()) {
                teamAName = ta.getName();
            }

            TeamDTO tb = teamClientService.getTeamById(teamIdB);
            if (tb != null && tb.getName() != null && !tb.getName().isBlank()) {
                teamBName = tb.getName();
            }

        } catch (Exception ex) {
            logger.warn("Failed to resolve team names",
                    keyValue("action", "teams_resolve_failed"),
                    keyValue("matchId", matchId),
                    keyValue("teamIdA", teamIdA),
                    keyValue("teamIdB", teamIdB),
                    ex);
        }

        StringBuilder body = new StringBuilder();
        body.append("Match terminé : ").append(teamAName).append(" vs ").append(teamBName).append(".");
        return new ResolvedContent(poolName, body.toString(), divisionId);
    }

    /** Petite record interne pour transporter titre+corps+logo */
    private record ResolvedContent(String title, String body, Long divisionId) {}
}