package com.blockout.workernotifications.models.dto.users;

import com.blockout.workernotifications.models.enums.EntityType;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserFavoriteDto {
    private EntityType entityType;
    private Long entityId;
}