package com.blockout.mobilegateway.user.api.models;

import com.blockout.mobilegateway.shared.application.models.EntityType;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserFavoriteResponse {
    private EntityType entityType;
    private Long entityId;
}
