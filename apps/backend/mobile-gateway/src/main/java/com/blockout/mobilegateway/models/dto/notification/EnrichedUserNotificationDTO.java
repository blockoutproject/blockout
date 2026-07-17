package com.blockout.mobilegateway.models.dto.notification;

import com.fasterxml.jackson.databind.JsonNode;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO enrichi pour les notifications.
 * - Reprend les champs de base de UserNotificationDTO
 * - Ajoute les infos division résolues par le mobile-gateway (logo, nom, etc.)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrichedUserNotificationDTO {
    private Long id;

    private Long userId;

    private String type;
    private String title;
    private String body;

    private String deepLink;

    private String targetType;

    private Long targetId;

    private JsonNode metadata;

    private Boolean isRead;

    private Boolean isOpened;

    private String createdAt;

    private String readAt;

    private String openedAt;

    private String divisionLogoUrl;
}
