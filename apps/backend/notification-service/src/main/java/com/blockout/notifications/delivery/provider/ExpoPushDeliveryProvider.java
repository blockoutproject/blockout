package com.blockout.notifications.delivery.provider;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.notifications.config.ExpoClientProperties;
import com.blockout.notifications.delivery.application.DeliveryBatchResult;
import com.blockout.notifications.delivery.application.DeliveryMessage;
import com.blockout.notifications.delivery.application.PushDeliveryProvider;
import com.niamedtech.expo.exposerversdk.ExpoPushNotificationClient;
import com.niamedtech.expo.exposerversdk.request.PushNotification;
import com.niamedtech.expo.exposerversdk.response.Status;
import com.niamedtech.expo.exposerversdk.response.TicketResponse;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** Contains Expo SDK messages and immediate ticket interpretation behind an application port. */
@Component
public class ExpoPushDeliveryProvider implements PushDeliveryProvider {

    private static final Logger LOGGER = LoggerFactory.getLogger(ExpoPushDeliveryProvider.class);
    private static final int MAX_BATCH = 100;

    private final ExpoSender sender;

    public ExpoPushDeliveryProvider(ExpoClientProperties properties) {
        ExpoPushNotificationClient client = ExpoPushNotificationClient.builder()
                .setHttpClient(HttpClients.createDefault())
                .setAccessToken(properties.getAccessToken())
                .build();
        sender = client::sendPushNotifications;
        LOGGER.info("Expo push provider initialized", keyValue("action", "expo_service_init"));
    }

    ExpoPushDeliveryProvider(ExpoSender sender) {
        this.sender = sender;
    }

    @Override
    public DeliveryBatchResult sendBatch(List<DeliveryMessage> messages) {
        if (messages == null || messages.isEmpty()) {
            LOGGER.info("Empty batch, nothing to send", keyValue("action", "expo_sdk_batch_skip"));
            return new DeliveryBatchResult(Set.of(), Set.of(), Set.of(), List.of());
        }
        List<DeliveryMessage> batch = messages.size() > MAX_BATCH ? messages.subList(0, MAX_BATCH) : messages;
        List<PushNotification> notifications = new ArrayList<>(batch.size());
        for (DeliveryMessage message : batch) {
            PushNotification notification = new PushNotification();
            notification.setTo(Collections.singletonList(message.token()));
            notification.setTitle(message.title());
            notification.setBody(message.body());
            if (!message.data().isEmpty()) {
                notification.setData(message.data());
            }
            notifications.add(notification);
        }
        try {
            List<TicketResponse.Ticket> tickets = sender.send(notifications);
            LOGGER.info("Expo SDK batch sent",
                    keyValue("action", "expo_sdk_batch_sent"),
                    keyValue("count", notifications.size()),
                    keyValue("tickets", tickets == null ? 0 : tickets.size()));
            return aggregate(batch, tickets);
        } catch (Exception exception) {
            LOGGER.error("Expo SDK send failed",
                    keyValue("action", "expo_sdk_send_failed"),
                    keyValue("count", notifications.size()), exception);
            Set<Long> failed = batch.stream().map(DeliveryMessage::userId).collect(Collectors.toSet());
            return new DeliveryBatchResult(Set.of(), failed, Set.of(), List.of());
        }
    }

    private DeliveryBatchResult aggregate(List<DeliveryMessage> batch, List<TicketResponse.Ticket> tickets) {
        int count = Math.min(batch.size(), tickets == null ? 0 : tickets.size());
        Map<Long, Integer> okByUser = new HashMap<>();
        Map<Long, Integer> errorByUser = new HashMap<>();
        List<String> invalidTokens = new ArrayList<>();
        for (int index = 0; index < count; index++) {
            DeliveryMessage message = batch.get(index);
            TicketResponse.Ticket ticket = tickets.get(index);
            if (ticket == null) {
                errorByUser.merge(message.userId(), 1, Integer::sum);
                LOGGER.warn("Null ticket received",
                        keyValue("action", "expo_ticket_null"),
                        keyValue("userId", message.userId()),
                        keyValue("token", mask(message.token())));
                continue;
            }
            if (Status.OK.equals(ticket.getStatus())) {
                okByUser.merge(message.userId(), 1, Integer::sum);
                continue;
            }
            errorByUser.merge(message.userId(), 1, Integer::sum);
            String tokenFromDetails = detailToken(ticket);
            String candidate = tokenFromDetails == null ? message.token() : tokenFromDetails;
            if (isDeviceNotRegistered(ticket.getMessage())) {
                invalidTokens.add(candidate);
            }
            LOGGER.warn("Expo ticket error",
                    keyValue("action", "expo_ticket_error"),
                    keyValue("userId", message.userId()),
                    keyValue("token", mask(candidate)),
                    keyValue("status", ticket.getStatus() == null ? "null" : ticket.getStatus().name()),
                    keyValue("message", ticket.getMessage()));
        }
        Set<Long> successful = okByUser.keySet();
        Set<Long> usersInBatch = batch.stream().map(DeliveryMessage::userId).collect(Collectors.toSet());
        Set<Long> retryable = batch.subList(count, batch.size()).stream()
                .map(DeliveryMessage::userId)
                .filter(userId -> !successful.contains(userId))
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<Long> failed = usersInBatch.stream()
                .filter(userId -> !successful.contains(userId)
                        && !retryable.contains(userId)
                        && errorByUser.getOrDefault(userId, 0) > 0)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        LOGGER.info("Expo batch aggregated",
                keyValue("action", "expo_batch_aggregate"),
                keyValue("okUsers", successful.size()),
                keyValue("failedUsers", failed.size()),
                keyValue("retryableUsers", retryable.size()),
                keyValue("invalidTokens", invalidTokens.size()));
        return new DeliveryBatchResult(successful, failed, retryable, invalidTokens);
    }

    private String detailToken(TicketResponse.Ticket ticket) {
        if (ticket.getDetails() == null) {
            return null;
        }
        try {
            return ticket.getDetails().getExpoPushToken();
        } catch (Exception ignored) {
            return null;
        }
    }

    private boolean isDeviceNotRegistered(String message) {
        if (message == null) {
            return false;
        }
        String normalized = message.toLowerCase(Locale.ROOT);
        return normalized.contains("devicenotregistered")
                || normalized.contains("not a registered push notification recipient")
                || normalized.contains("not registered");
    }

    private String mask(String token) {
        if (token == null || token.length() < 12) {
            return token;
        }
        return token.substring(0, 6) + "..." + token.substring(token.length() - 4);
    }

    @FunctionalInterface
    interface ExpoSender {
        List<TicketResponse.Ticket> send(List<PushNotification> notifications) throws Exception;
    }
}
