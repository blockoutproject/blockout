package com.blockout.notifications.notification.infrastructure.http.models;

import com.blockout.notifications.notification.application.models.EntityType;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserFavoriteSummaryInternalResponse {
    private EntityType entityType;
    private Long entityId;
}
