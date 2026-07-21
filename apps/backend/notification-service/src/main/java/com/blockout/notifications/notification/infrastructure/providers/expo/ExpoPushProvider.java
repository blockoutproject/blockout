package com.blockout.notifications.notification.infrastructure.providers.expo;

import com.blockout.notifications.config.ExpoClientProperties;
import com.niamedtech.expo.exposerversdk.ExpoPushNotificationClient;
import com.niamedtech.expo.exposerversdk.request.PushNotification;
import com.niamedtech.expo.exposerversdk.response.Status;
import com.niamedtech.expo.exposerversdk.response.TicketResponse;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

/**
 * Service d’envoi Expo via le SDK "expo-server-sdk-java" (hlspablo).
 * - Construit 1 PushNotification par token pour conserver le mapping
 * index→(userId, token)
 * - Envoie en lots (≤100) comme recommandé par Expo
 * - Agrège les tickets → { users OK, users KO, tokens invalides }
 */
@Service
public class ExpoPushProvider {

    private static final Logger logger = LoggerFactory.getLogger(ExpoPushProvider.class);
    private static final int MAX_BATCH = 100;

    private final ExpoPushNotificationClient client;

    public ExpoPushProvider(ExpoClientProperties expoClientProperties) {
        CloseableHttpClient httpClient = HttpClients.createDefault();

        this.client = ExpoPushNotificationClient
            .builder()
            .setHttpClient(httpClient)
            .setAccessToken(expoClientProperties.getAccessToken())
            .build();

        logger.info("ExpoPushService initialized",
            keyValue("action", "expo_service_init"));
    }

    /**
     * Envoie un lot (≤100) de notifications Expo.
     *
     * @param messages Liste de messages internes (un entry par token)
     * @return agrégat {userIdsOk, userIdsFailed, invalidTokens}
     */
    public ExpoBatchResult sendBatch(List<ExpoMessage> messages) {
        if (messages == null || messages.isEmpty()) {
            logger.info("Empty batch, nothing to send",
                keyValue("action", "expo_sdk_batch_skip"));
            return new ExpoBatchResult(Set.of(), Set.of(), List.of());
        }

        List<ExpoMessage> batch = messages.size() > MAX_BATCH ? messages.subList(0, MAX_BATCH) : messages;

        // Mapping index -> userId/token pour corrélation
        Map<Integer, Long> indexToUser = new HashMap<>(batch.size());
        Map<Integer, String> indexToToken = new HashMap<>(batch.size());

        List<PushNotification> notifications = new ArrayList<>(batch.size());
        for (int i = 0; i < batch.size(); i++) {
            ExpoMessage m = batch.get(i);
            indexToUser.put(i, m.getUserId());
            indexToToken.put(i, m.getTo());

            PushNotification pn = new PushNotification();
            pn.setTo(Collections.singletonList(m.getTo()));
            pn.setTitle(m.getTitle());
            pn.setBody(m.getBody());
            if (m.getData() != null && !m.getData().isEmpty()) {
                pn.setData(m.getData());
            }
            notifications.add(pn);
        }

        try {
            List<TicketResponse.Ticket> tickets = client.sendPushNotifications(notifications);

            logger.info("Expo SDK batch sent",
                keyValue("action", "expo_sdk_batch_sent"),
                keyValue("count", notifications.size()),
                keyValue("tickets", tickets != null ? tickets.size() : 0));

            return aggregateTickets(batch, tickets, indexToUser, indexToToken);

        } catch (Exception e) {
            logger.error("Expo SDK send failed",
                keyValue("action", "expo_sdk_send_failed"),
                keyValue("count", notifications.size()), e);

            // Échec global → tous les users de ce lot = failed
            Set<Long> failedUsers = batch.stream().map(ExpoMessage::getUserId).collect(Collectors.toSet());
            return new ExpoBatchResult(Set.of(), failedUsers, List.of());
        }
    }

    private ExpoBatchResult aggregateTickets(
        List<ExpoMessage> batch,
        List<TicketResponse.Ticket> tickets,
        Map<Integer, Long> indexToUser,
        Map<Integer, String> indexToToken) {

        int n = Math.min(batch.size(), tickets != null ? tickets.size() : 0);

        Map<Long, Integer> perUserOk = new HashMap<>();
        Map<Long, Integer> perUserErr = new HashMap<>();
        List<String> invalidTokens = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            Long userId = indexToUser.get(i);
            String tokenUsed = indexToToken.get(i);
            TicketResponse.Ticket tk = tickets.get(i);

            if (tk == null) {
                perUserErr.merge(userId, 1, Integer::sum);
                logger.warn("Null ticket received",
                    keyValue("action", "expo_ticket_null"),
                    keyValue("userId", userId),
                    keyValue("token", mask(tokenUsed)));
                continue;
            }

            Status status = tk.getStatus(); // enum OK | ERROR
            if (Status.OK.equals(status)) {
                perUserOk.merge(userId, 1, Integer::sum);
                continue;
            }

            // status = ERROR
            perUserErr.merge(userId, 1, Integer::sum);

            String msg = tk.getMessage();
            String tokenFromDetails = null;
            if (tk.getDetails() != null) {
                try {
                    tokenFromDetails = tk.getDetails().getExpoPushToken(); // parfois dispo
                } catch (Exception ignore) {
                    // selon versions du SDK/détails renvoyés
                }
            }

            String candidate = tokenFromDetails != null ? tokenFromDetails : tokenUsed;

            if (isDeviceNotRegistered(msg)) {
                invalidTokens.add(candidate);
            }

            logger.warn("Expo ticket error",
                keyValue("action", "expo_ticket_error"),
                keyValue("userId", userId),
                keyValue("token", mask(candidate)),
                keyValue("status", status != null ? status.name() : "null"),
                keyValue("message", msg));
        }

        // Users OK = au moins un ticket OK dans ce lot
        Set<Long> okUsers = perUserOk.keySet();

        // Users KO = présents dans le lot ET aucun OK (mais au moins une erreur)
        Set<Long> usersInBatch = batch.stream().map(ExpoMessage::getUserId).collect(Collectors.toSet());
        Set<Long> failedUsers = usersInBatch.stream()
            .filter(u -> !okUsers.contains(u) && perUserErr.getOrDefault(u, 0) > 0)
            .collect(Collectors.toCollection(LinkedHashSet::new));

        logger.info("Expo batch aggregated",
            keyValue("action", "expo_batch_aggregate"),
            keyValue("okUsers", okUsers.size()),
            keyValue("failedUsers", failedUsers.size()),
            keyValue("invalidTokens", invalidTokens.size()));

        return new ExpoBatchResult(okUsers, failedUsers, invalidTokens);
    }

    private boolean isDeviceNotRegistered(String message) {
        if (message == null)
            return false;
        String m = message.toLowerCase(Locale.ROOT);
        // Messages fréquents côté Expo pour token invalide
        return m.contains("devicenotregistered")
            || m.contains("not a registered push notification recipient")
            || m.contains("not registered");
    }

    private String mask(String token) {
        if (token == null || token.length() < 12)
            return token;
        return token.substring(0, 6) + "..." + token.substring(token.length() - 4);
    }
}
