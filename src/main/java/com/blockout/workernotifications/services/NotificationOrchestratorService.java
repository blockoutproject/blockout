package com.blockout.workernotifications.services;

import com.blockout.workernotifications.models.dto.ResolvePage;
import com.blockout.workernotifications.models.dto.expo.ExpoMessage;
import com.blockout.workernotifications.services.clients.UsersClientService;
import com.blockout.workernotifications.models.dto.expo.ExpoBatchResult;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class NotificationOrchestratorService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationOrchestratorService.class);

    private final NotificationSendService notificationSendService;
    private final UsersClientService usersClientService;
    private final ExpoPushService expoPushService;

    // Paramètres (peuvent être externalisés via @ConfigurationProperties)
    private static final int RESOLVE_PAGE_SIZE = 2_000;   // userIds par page de résolution
    private static final int EXPO_BATCH_SIZE   = 100;     // Expo limite à 100 messages / requête

    /**
     * Orchestration complète pour un match terminé.
     * 1) Réservation idempotente des destinataires
     * 2) Résolution des tokens par pages
     * 3) Envoi via SDK Expo par lots
     * 4) Marquages en base + désactivation tokens invalides
     */
    @Transactional
    public void handleMatchFinished(Long matchId, List<Long> teamIds, List<Long> poolIds, String setInfo) {
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
                keyValue("reservedCount", reservedUserIds.size()));

        // Pagination de la résolution des tokens
        for (int from = 0; from < reservedUserIds.size(); from += RESOLVE_PAGE_SIZE) {
            int to = Math.min(from + RESOLVE_PAGE_SIZE, reservedUserIds.size());
            List<Long> pageUserIds = reservedUserIds.subList(from, to);

            ResolvePage page = usersClientService.resolveTokens(pageUserIds);

            // Marquer en SENT_NO_TOKEN les users de la page qui n'ont aucun token
            if (page.getNoTokenUserIds() != null && !page.getNoTokenUserIds().isEmpty()) {
                notificationSendService.markSent(matchId, page.getNoTokenUserIds(), true);
            }

            // Construire les messages Expo
            List<ExpoMessage> messages = new ArrayList<>();
            if (page.getTokensByUser() != null && !page.getTokensByUser().isEmpty()) {
                page.getTokensByUser().forEach((userId, tokens) -> {
                    if (tokens == null || tokens.isEmpty()) return;
                    for (String token : tokens) {
                        messages.add(ExpoMessage.builder()
                                .to(token)
                                .title("Match terminé")
                                .body(buildBody(setInfo))
                                .data(Map.of("matchId", matchId)) // optionnel pour deep-link
                                .userId(userId)    // interne
                                .matchId(matchId)  // interne
                                .build());
                    }
                });
            }

            // Envoi en lots via le SDK Expo
            Set<Long> usersSent = new HashSet<>();
            Set<Long> usersFailed = new HashSet<>();
            List<String> invalidTokens = new ArrayList<>();

            for (int i = 0; i < messages.size(); i += EXPO_BATCH_SIZE) {
                int end = Math.min(i + EXPO_BATCH_SIZE, messages.size());
                List<ExpoMessage> batch = messages.subList(i, end);

                ExpoBatchResult result = expoPushService.sendBatch(batch);

                if (result.getUserIdsOk() != null) usersSent.addAll(result.getUserIdsOk());
                if (result.getUserIdsFailed() != null) usersFailed.addAll(result.getUserIdsFailed());
                if (result.getInvalidTokens() != null) invalidTokens.addAll(result.getInvalidTokens());
            }

            // Marquages DB
            if (!usersSent.isEmpty()) {
                notificationSendService.markSent(matchId, usersSent, false);
            }
            if (!usersFailed.isEmpty()) {
                notificationSendService.markFailed(matchId, usersFailed, "EXPO_SEND_ERROR", "See logs for details");
            }

            // Nettoyage tokens invalides côté Users
            if (!invalidTokens.isEmpty()) {
                usersClientService.deactivateTokens(invalidTokens);
            }

            logger.info("Resolve+push page done",
                    keyValue("action", "notification_page_done"),
                    keyValue("matchId", matchId),
                    keyValue("pageUsers", pageUserIds.size()),
                    keyValue("sentUsers", usersSent.size()),
                    keyValue("failedUsers", usersFailed.size()),
                    keyValue("invalidTokens", invalidTokens.size()));
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