package com.blockout.matches.models.dto.users;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.blockout.matches.models.enums.EntityType;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class UserFavoriteDTO {

    @JsonProperty("entity_type")
    private EntityType entityType;

    @JsonProperty("entity_id")
    private Long entityId;
}