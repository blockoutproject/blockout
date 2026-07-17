package com.blockout.mobilegateway.models.dto.user;

import com.blockout.mobilegateway.models.enums.EntityType;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserFavoriteDTO {
    @JsonProperty("entity_type")
    private EntityType entityType;

    @JsonProperty("entity_id")
    private Long entityId;
}
