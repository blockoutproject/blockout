package com.blockout.mobilegateway.models.dto.notifications;

import com.fasterxml.jackson.annotation.JsonProperty;

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

    @JsonProperty("user_id")
    private Long userId;

    private String type;
    private String title;
    private String body;

    @JsonProperty("deep_link")
    private String deepLink;

    @JsonProperty("target_type")
    private String targetType;

    @JsonProperty("target_id")
    private Long targetId;

    private String metadata;

    @JsonProperty("is_read")
    private Boolean isRead;

    @JsonProperty("is_opened")
    private Boolean isOpened;

    @JsonProperty("created_at")
    private String createdAt;

    @JsonProperty("read_at")
    private String readAt;

    @JsonProperty("opened_at")
    private String openedAt;

    @JsonProperty("division_logo_url")
    private String divisionLogoUrl;
}