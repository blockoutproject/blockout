package com.blockout.users.models.dto;

import com.blockout.users.models.enums.EntityType;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserFavoriteDTO {
    private EntityType entityType;
    private Long entityId;
}