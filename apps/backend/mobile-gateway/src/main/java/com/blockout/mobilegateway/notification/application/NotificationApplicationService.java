package com.blockout.mobilegateway.notification.application;

import com.blockout.mobilegateway.config.api.models.DivisionResponse;
import com.blockout.mobilegateway.config.infrastructure.ConfigInternalClient;
import com.blockout.mobilegateway.notification.api.models.*;
import com.blockout.mobilegateway.notification.application.views.NotificationItemView;
import com.blockout.mobilegateway.notification.application.views.NotificationPageView;
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

    public NotificationPageResponse getNotifications(int page, int size) {
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
                DivisionResponse division = configInternalClient.getDivisionById(divisionId);
                String logoUrl = (division != null) ? division.getLogoUrl() : null;
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

        List<NotificationResponse> enriched = new ArrayList<>(rawItems.size());
        for (NotificationItemView n : rawItems) {
            String divisionLogoUrl = extractDivisionIdSafely(n.metadata())
                .map(divisionLogoCache::get)
                .orElse(null);

            enriched.add(NotificationResponse.builder()
                .id(n.id())
                .userId(n.userId())
                .type(n.type())
                .title(n.title())
                .body(n.body())
                .deepLink(n.deepLink())
                .targetType(n.targetType())
                .targetId(n.targetId())
                .metadata(n.metadata())
                .isRead(n.isRead())
                .isOpened(n.isOpened())
                .createdAt(n.createdAt())
                .readAt(n.readAt())
                .openedAt(n.openedAt())
                .divisionLogoUrl(divisionLogoUrl)
                .build());
        }

        logger.debug("Built enriched notifications page",
            keyValue("action", "build_enriched_notifications_page"),
            keyValue("enriched_count", enriched.size()));

        boolean hasNext = base != null && base.hasNext();
        Integer nextPage = base != null ? base.nextPage() : null;

        return NotificationPageResponse.builder()
            .notifications(enriched)
            .hasNext(hasNext)
            .nextPage(nextPage)
            .build();
    }

    public UnreadCountResponse getUnreadNotificationsCount() {
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

    public void registerPushToken(Long userId, RegisterPushTokenRequest req) {
        logger.info("Register push token",
            keyValue("action", "register_push_token"),
            keyValue("user_id", userId),
            keyValue("platform", req.getPlatform()));
        notificationInternalClient.registerPushToken(userId, req);
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
