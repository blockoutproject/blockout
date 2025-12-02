package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.notification.EnrichedUserNotificationDTO;
import com.blockout.mobilegateway.models.dto.notification.EnrichedUserNotificationPageDTO;
import com.blockout.mobilegateway.models.dto.notification.RegisterPushTokenRequestDTO;
import com.blockout.mobilegateway.models.dto.notification.UnreadCountDTO;
import com.blockout.mobilegateway.models.dto.notification.UserNotificationDTO;
import com.blockout.mobilegateway.models.dto.notification.UserNotificationPageDTO;
import com.blockout.mobilegateway.services.clients.ConfigClientService;
import com.blockout.mobilegateway.services.clients.NotificationClientService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationClientService notificationClientService;
    private final ConfigClientService configClientService;

    private final ConcurrentMap<Long, String> divisionLogoCache = new ConcurrentHashMap<>();

    public EnrichedUserNotificationPageDTO getNotifications(int page, int size) {
        logger.info("Fetching notifications",
                keyValue("action", "fetch_notifications"),
                keyValue("page", page),
                keyValue("size", size));

        UserNotificationPageDTO base = notificationClientService.getNotifications(page, size);

        List<UserNotificationDTO> rawItems = (base == null || base.getNotifications() == null)
                ? Collections.emptyList()
                : base.getNotifications();

        logger.debug("Base notifications received",
                keyValue("action", "base_notifications_received"),
                keyValue("count", rawItems.size()),
                keyValue("has_next", base != null && base.isHasNext()),
                keyValue("next_page", base != null ? base.getNextPage() : null));

        Set<Long> divisionIds = rawItems.stream()
                .map(UserNotificationDTO::getMetadata)
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
                DivisionDTO division = configClientService.getDivisionById(divisionId);
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

        List<EnrichedUserNotificationDTO> enriched = new ArrayList<>(rawItems.size());
        for (UserNotificationDTO n : rawItems) {
            String divisionLogoUrl = extractDivisionIdSafely(n.getMetadata())
                    .map(divisionLogoCache::get)
                    .orElse(null);

            enriched.add(EnrichedUserNotificationDTO.builder()
                    .id(n.getId())
                    .userId(n.getUserId())
                    .type(n.getType())
                    .title(n.getTitle())
                    .body(n.getBody())
                    .deepLink(n.getDeepLink())
                    .targetType(n.getTargetType())
                    .targetId(n.getTargetId())
                    .metadata(n.getMetadata())
                    .isRead(n.getIsRead())
                    .isOpened(n.getIsOpened())
                    .createdAt(n.getCreatedAt())
                    .readAt(n.getReadAt())
                    .openedAt(n.getOpenedAt())
                    .divisionLogoUrl(divisionLogoUrl)
                    .build());
        }

        logger.debug("Built enriched notifications page",
                keyValue("action", "build_enriched_notifications_page"),
                keyValue("enriched_count", enriched.size()));

        boolean hasNext = base != null && base.isHasNext();
        Integer nextPage = base != null ? base.getNextPage() : null;

        return EnrichedUserNotificationPageDTO.builder()
                .notifications(enriched)
                .hasNext(hasNext)
                .nextPage(nextPage)
                .build();
    }

    public UnreadCountDTO getUnreadNotificationsCount() {
        logger.info("Fetching unread notifications count",
                keyValue("action", "fetch_unread_count"));
        return notificationClientService.getUnreadNotificationsCount();
    }

    public void markNotificationRead(Long id) {
        logger.info("Mark notification as read",
                keyValue("action", "mark_read"),
                keyValue("notification_id", id));
        notificationClientService.markNotificationRead(id);
    }

    public void markNotificationOpened(Long id) {
        logger.info("Mark notification as opened",
                keyValue("action", "mark_opened"),
                keyValue("notification_id", id));
        notificationClientService.markNotificationOpened(id);
    }

    public void deleteNotification(Long id) {
        logger.info("Delete notification",
                keyValue("action", "delete_notification"),
                keyValue("notification_id", id));
        notificationClientService.deleteNotification(id);
    }

    public void registerPushToken(Long userId, RegisterPushTokenRequestDTO req) {
        logger.info("Register push token",
                keyValue("action", "register_push_token"),
                keyValue("user_id", userId),
                keyValue("platform", req.getPlatform()));
        notificationClientService.registerPushToken(userId, req);
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