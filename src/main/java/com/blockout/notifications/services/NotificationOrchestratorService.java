package com.blockout.notifications.services;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.blockout.notifications.models.UserNotification;
import com.blockout.notifications.models.dto.ResolvePage;
import com.blockout.notifications.models.dto.expo.ExpoBatchResult;
import com.blockout.notifications.models.dto.expo.ExpoMessage;
import com.blockout.notifications.models.enums.NotificationTargetType;
import com.blockout.notifications.models.enums.NotificationType;

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

    // Idéalement: @ConfigurationProperties(prefix = "notifications.push")
    private static final int RESOLVE_PAGE_SIZE = 2_000;
    private static final int EXPO_BATCH_SIZE = 100;

    public void handleMatchFinished(Long matchId, List<Long> teamIds, List<Long> poolIds, String setInfo) {

        // Réservation en base (idempotent) – transaction courte à l’intérieur du
        // service
        List<Long> reservedUserIds = notificationSendService.reservePendingForMatch(matchId, teamIds, poolIds);
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
                keyValue("expoBatchSize", EXPO_BATCH_SIZE));

        // 2) Créer une UserNotification pour chaque user réservé
        String title = "Match terminé";
        String body = buildBody(setInfo);

        List<UserNotification> bulk = new ArrayList<>(reservedUserIds.size());
        for (Long userId : reservedUserIds) {
            bulk.add(UserNotification.builder()
                    .userId(userId)
                    .type(NotificationType.MATCH_FINISHED)
                    .title(title)
                    .body(body)
                    .deepLink("/matches/" + matchId)
                    .targetType(NotificationTargetType.MATCH)
                    .targetId(matchId)
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

        // Résolution des tokens par pages
        int pageIndex = 0;
        for (int from = 0; from < reservedUserIds.size(); from += RESOLVE_PAGE_SIZE, pageIndex++) {
            int to = Math.min(from + RESOLVE_PAGE_SIZE, reservedUserIds.size());
            List<Long> pageUserIds = reservedUserIds.subList(from, to);

            ResolvePage page = pushTokenService.resolveTokensPage(pageUserIds);

            // Marquer ceux sans token
            if (!page.getNoTokenUserIds().isEmpty()) {
                notificationSendService.markSent(matchId, page.getNoTokenUserIds(), true);
            }

            // Construire les messages Expo (dedupe token par user)
            List<ExpoMessage> messages = new ArrayList<>();
            if (page.getTokensByUser() != null && !page.getTokensByUser().isEmpty()) {
                for (Map.Entry<Long, List<String>> e : page.getTokensByUser().entrySet()) {
                    Long userId = e.getKey();
                    // dédupe en conservant l’ordre
                    List<String> tokens = e.getValue() == null ? List.of()
                            : e.getValue().stream().distinct().toList();

                    for (String token : tokens) {
                        messages.add(ExpoMessage.builder()
                                .to(token)
                                .title("Match terminé")
                                .body(buildBody(setInfo))
                                .data(Map.of("matchId", matchId))
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

            // Envoi par lots Expo
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
                    // Échec global du batch → tous les users de ce batch en failed
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

            // Marquages DB + nettoyage tokens invalides
            if (!usersSent.isEmpty()) {
                notificationSendService.markSent(matchId, usersSent, false);
            }
            if (!usersFailed.isEmpty()) {
                notificationSendService.markFailed(matchId, usersFailed, "EXPO_SEND_ERROR", "See logs for details");
            }
            if (!invalidTokens.isEmpty()) {
                // dédupe pour éviter des POST inutiles
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

    private String buildBody(String setInfo) {
        if (setInfo == null || setInfo.isBlank()) {
            return "Le match est terminé. Ouvre l'app pour voir le score !";
        }
        return "Le match est terminé (set : " + setInfo + "). Ouvre l'app pour voir le score !";
    }
}