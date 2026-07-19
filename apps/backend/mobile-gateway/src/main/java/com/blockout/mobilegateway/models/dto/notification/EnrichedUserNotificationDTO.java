package com.blockout.mobilegateway.models.dto.notification;

import com.fasterxml.jackson.databind.JsonNode;
import com.blockout.mobilegateway.models.enums.NotificationTargetType;
import com.blockout.mobilegateway.models.enums.NotificationType;
import java.time.Instant;

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

    private NotificationType type;
    private String title;
    private String body;

    private String deepLink;

    private NotificationTargetType targetType;

    private Long targetId;

    private JsonNode metadata;

    private Boolean isRead;

    private Boolean isOpened;

    private Instant createdAt;

    private Instant readAt;

    private Instant openedAt;

    private String divisionLogoUrl;
}
