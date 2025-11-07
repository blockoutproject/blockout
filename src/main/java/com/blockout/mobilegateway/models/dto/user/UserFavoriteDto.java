package com.blockout.mobilegateway.models.dto.user;

import com.blockout.mobilegateway.models.enums.EntityType;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserFavoriteDTO {
    private EntityType entityType;
    private Long entityId;
}