package com.blockout.mobilegateway.notification.application;

import com.blockout.mobilegateway.config.application.views.DivisionView;
import com.blockout.mobilegateway.config.infrastructure.ConfigInternalClient;
import com.blockout.mobilegateway.notification.application.commands.RegisterPushTokenCommand;
import com.blockout.mobilegateway.notification.application.views.NotificationItemView;
import com.blockout.mobilegateway.notification.application.views.NotificationPageView;
import com.blockout.mobilegateway.notification.application.views.UnreadCountView;
import com.blockout.mobilegateway.notification.infrastructure.NotificationInternalClient;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.stream.Collectors;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

/**
 * Enriches internal notifications for the existing mobile-facing API.
 */
@Service
@RequiredArgsConstructor
public class NotificationApplicationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationApplicationService.class);

    private final NotificationInternalClient notificationInternalClient;
    private final ConfigInternalClient configInternalClient;

    private final ConcurrentMap<Long, String> divisionLogoCache = new ConcurrentHashMap<>();

    public NotificationPageView getNotifications(int page, int size) {
        logger.info("Fetching notifications",
            keyValue("action", "fetch_notifications"),
            keyValue("page", page),
            keyValue("size", size));

        NotificationPageView base = notificationInternalClient.getNotifications(page, size);

        List<NotificationItemView> rawItems = (base == null || base.notifications() == null)
            ? Collections.emptyList()
            : base.notifications();

        logger.debug("Base notifications received",
            keyValue("action", "base_notifications_received"),
            keyValue("count", rawItems.size()),
            keyValue("has_next", base != null && base.hasNext()),
            keyValue("next_page", base != null ? base.nextPage() : null));

        Set<Long> divisionIds = rawItems.stream()
            .map(NotificationItemView::metadata)
            .map(this::extractDivisionIdSafely)
            .flatMap(Optional::stream)
            .collect(Collectors.toCollection(LinkedHashSet::new));

        logger.debug("Extracted divisionIds from metadata",
            keyValue("action", "extract_division_ids"),
            keyValue("division_ids_count", divisionIds.size()));

        List<Long> toResolve = divisionIds.stream()
            .filter(id -> !divisionLogoCache.containsKey(id))
            .toList();

        for (Long divisionId : toResolve) {
            try {
                DivisionView division = configInternalClient.getDivisionById(divisionId);
                String logoUrl = (division != null) ? division.logoUrl() : null;
                divisionLogoCache.put(divisionId, (logoUrl != null && !logoUrl.isBlank()) ? logoUrl : null);
                logger.debug("Division logo resolved",
                    keyValue("action", "division_logo_resolved"),
                    keyValue("division_id", divisionId),
                    keyValue("has_logo", logoUrl != null));
            } catch (Exception ex) {
                logger.warn("Failed to resolve division logo",
                    keyValue("action", "division_logo_resolve_failed"),
                    keyValue("division_id", divisionId),
                    ex);
                divisionLogoCache.putIfAbsent(divisionId, null);
            }
        }

        List<NotificationItemView> enriched = new ArrayList<>(rawItems.size());
        for (NotificationItemView n : rawItems) {
            String divisionLogoUrl = extractDivisionIdSafely(n.metadata())
                .map(divisionLogoCache::get)
                .orElse(null);

            enriched.add(new NotificationItemView(
                n.id(), n.userId(), n.type(), n.title(), n.body(), n.deepLink(), n.targetType(), n.targetId(),
                n.metadata(), n.isRead(), n.isOpened(), n.createdAt(), n.readAt(), n.openedAt(), divisionLogoUrl));
        }

        logger.debug("Built enriched notifications page",
            keyValue("action", "build_enriched_notifications_page"),
            keyValue("enriched_count", enriched.size()));

        boolean hasNext = base != null && base.hasNext();
        Integer nextPage = base != null ? base.nextPage() : null;

        return new NotificationPageView(enriched, hasNext, nextPage);
    }

    public UnreadCountView getUnreadNotificationsCount() {
        logger.info("Fetching unread notifications count",
            keyValue("action", "fetch_unread_count"));
        return notificationInternalClient.getUnreadNotificationsCount();
    }

    public void markNotificationRead(Long id) {
        logger.info("Mark notification as read",
            keyValue("action", "mark_read"),
            keyValue("notification_id", id));
        notificationInternalClient.markNotificationRead(id);
    }

    public void markNotificationOpened(Long id) {
        logger.info("Mark notification as opened",
            keyValue("action", "mark_opened"),
            keyValue("notification_id", id));
        notificationInternalClient.markNotificationOpened(id);
    }

    public void deleteNotification(Long id) {
        logger.info("Delete notification",
            keyValue("action", "delete_notification"),
            keyValue("notification_id", id));
        notificationInternalClient.deleteNotification(id);
    }

    public void registerPushToken(Long userId, RegisterPushTokenCommand command) {
        logger.info("Register push token",
            keyValue("action", "register_push_token"),
            keyValue("user_id", userId),
            keyValue("platform", command.platform()));
        notificationInternalClient.registerPushToken(userId, command);
    }

    private Optional<Long> extractDivisionIdSafely(JsonNode metadata) {
        if (metadata == null || metadata.isMissingNode() || metadata.isNull()) {
            return Optional.empty();
        }
        JsonNode div = metadata.get("divisionId");
        if (div == null || div.isNull()) {
            return Optional.empty();
        }
        if (div.isNumber()) {
            return Optional.of(div.asLong());
        } else if (div.isTextual()) {
            String txt = div.asText();
            if (txt == null || txt.isBlank())
                return Optional.empty();
            try {
                return Optional.of(Long.parseLong(txt));
            } catch (NumberFormatException nfe) {
                logger.debug("Non parsable divisionId",
                    keyValue("action", "division_id_parse_failed"),
                    keyValue("value", txt));
            }
        }
        return Optional.empty();
    }
}
