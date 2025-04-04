package com.blockout.users.models.dto;

import com.blockout.users.models.EntityType;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserFavoriteDto {
    private EntityType entityType;
    private Long entityId;
}