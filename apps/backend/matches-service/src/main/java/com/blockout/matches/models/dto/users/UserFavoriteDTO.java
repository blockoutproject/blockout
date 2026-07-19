package com.blockout.matches.models.dto.users;

import com.blockout.matches.models.enums.EntityType;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class UserFavoriteDTO {

    private EntityType entityType;

    private Long entityId;
}