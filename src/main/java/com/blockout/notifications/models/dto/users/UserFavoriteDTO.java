package com.blockout.notifications.models.dto.users;

import com.blockout.notifications.models.enums.EntityType;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserFavoriteDTO {
    private EntityType entityType;
    private Long entityId;
}
