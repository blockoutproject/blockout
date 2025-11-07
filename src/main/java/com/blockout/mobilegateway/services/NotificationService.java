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

    /**
     * Cache simple en mémoire pour éviter des fetchs répétés :
     * divisionId -> divisionLogoUrl (peut être null si inconnu/absent).
     */
    private final ConcurrentMap<Long, String> divisionLogoCache = new ConcurrentHashMap<>();

    /**
     * Récupère une page de notifications et renvoie la version enrichie avec logo
     * de division.
     */
    public EnrichedUserNotificationPageDTO getNotifications(int page, int size) {
        logger.info("Fetching notifications",
                keyValue("action", "fetch_unreached_notifications"),
                keyValue("page", page),
                keyValue("size", size));

        UserNotificationPageDTO base = notificationClientService.getNotifications(page, size);

        for (UserNotificationDTO n : base.getNotifications()) {
            logger.warn("Notification fetched",
                    keyValue("id", n.getId()),
                    keyValue("userId", n.getUserId()),
                    keyValue("type", n.getType()),
                    keyValue("title", n.getTitle()),
                    keyValue("isRead", n.getIsRead()),
                    keyValue("createdAt", n.getCreatedAt()));
        }

        List<UserNotificationDTO> rawItems = (base == null || base.getNotifications() == null)
                ? Collections.emptyList()
                : base.getNotifications();

        logger.info("Base notifications received",
                keyValue("count", rawItems.size()),
                keyValue("hasNext", base != null && base.isHasNext()),
                keyValue("nextPage", base != null ? base.getNextPage() : null));

        // 1) Extraire & dé-dupliquer les divisionIds des metadata
        Set<Long> divisionIds = rawItems.stream()
                .map(UserNotificationDTO::getMetadata)
                .map(this::extractDivisionIdSafely)
                .flatMap(Optional::stream)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        logger.info("Extracted divisionIds from metadata",
                keyValue("divisionIdsCount", divisionIds.size()));

        // 2) Résoudre les logos manquants (non présents en cache)
        List<Long> toResolve = divisionIds.stream()
                .filter(id -> !divisionLogoCache.containsKey(id))
                .toList();

        for (Long divisionId : toResolve) {
            try {
                DivisionDTO division = configClientService.getDivisionById(divisionId);
                String logoUrl = (division != null) ? division.getLogoUrl() : null;
                divisionLogoCache.put(divisionId, (logoUrl != null && !logoUrl.isBlank()) ? logoUrl : null);
            } catch (Exception ex) {
                logger.warn("Failed to resolve division logo",
                        keyValue("action", "division_logo_resolve_failed"),
                        keyValue("divisionId", divisionId),
                        ex);
                divisionLogoCache.putIfAbsent(divisionId, null); // negative caching
            }
        }

        // 3) Construire la liste enrichie
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

        logger.info("Built enriched notifications page",
                keyValue("enrichedCount", enriched.size()));

        boolean hasNext = base != null && base.isHasNext();
        Integer nextPage = base != null ? base.getNextPage() : null;

        return EnrichedUserNotificationPageDTO.builder()
                .notifications(enriched)
                .hasNext(hasNext)
                .nextPage(nextPage)
                .build();
    }

    public UnreadCountDTO getUnreadNotificationsCount() {
        return notificationClientService.getUnreadNotificationsCount();
    }

    public void markNotificationRead(Long id) {
        notificationClientService.markNotificationRead(id);
    }

    public void markNotificationOpened(Long id) {
        notificationClientService.markNotificationOpened(id);
    }

    public void deleteNotification(Long id) {
        notificationClientService.deleteNotification(id);
    }

    public void registerPushToken(Long userId, RegisterPushTokenRequestDTO req) {
        notificationClientService.registerPushToken(userId, req);
    }

    /**
     * Parse un JsonNode metadata et récupère un divisionId s'il est présent (number
     * ou string).
     */
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
                logger.debug("divisionId textual but non-parsable",
                        keyValue("value", txt));
            }
        }

        return Optional.empty();
    }
}