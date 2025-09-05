package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.notifications.EnrichedUserNotificationDTO;
import com.blockout.mobilegateway.models.dto.notifications.EnrichedUserNotificationPageDTO;
import com.blockout.mobilegateway.models.dto.notifications.UserNotificationPageDTO;
import com.blockout.mobilegateway.models.dto.notifications.UserNotificationDTO;
import com.blockout.mobilegateway.services.clients.ConfigClientService;
import com.blockout.mobilegateway.services.clients.NotificationClientService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.*;
import java.util.stream.Collectors;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class EnrichedUserNotificationService {

    private static final Logger logger = LoggerFactory.getLogger(EnrichedUserNotificationPageDTO.class);

    private final NotificationClientService notificationClientService;
    private final ConfigClientService configClientService;
    private final ObjectMapper objectMapper;

    /**
     * Cache simple en mémoire pour éviter des fetchs répétés :
     * divisionId -> divisionLogoUrl (peut être null si inconnu/absent).
     */
    private final ConcurrentMap<Long, String> divisionLogoCache = new ConcurrentHashMap<>();

    /**
     * Récupère une page de notifications et renvoie la version enrichie avec logo de division.
     */
    public EnrichedUserNotificationPageDTO getEnrichedNotifications(int page, int size) {
        logger.info("Fetching notifications (unreached/enriched)",
                keyValue("action", "fetch_unreached_notifications"),
                keyValue("page", page),
                keyValue("size", size));

        UserNotificationPageDTO base = notificationClientService.getNotifications(page, size);

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

    /**
     * Parse metadata JSON et récupère un divisionId s'il est présent (number ou string).
     */
    private Optional<Long> extractDivisionIdSafely(String metadata) {
        if (metadata == null || metadata.isBlank()) return Optional.empty();
        try {
            JsonNode node = objectMapper.readTree(metadata);
            if (node == null) return Optional.empty();
            JsonNode div = node.get("divisionId");
            if (div == null || div.isNull()) return Optional.empty();

            if (div.isNumber()) {
                return Optional.of(div.asLong());
            } else if (div.isTextual()) {
                String txt = div.asText();
                if (txt == null || txt.isBlank()) return Optional.empty();
                try {
                    return Optional.of(Long.parseLong(txt));
                } catch (NumberFormatException nfe) {
                    logger.debug("divisionId textual but non-parsable",
                            keyValue("value", txt));
                }
            }
        } catch (Exception ex) {
            logger.debug("Failed to parse metadata JSON",
                    keyValue("metadata", metadata));
        }
        return Optional.empty();
    }
}