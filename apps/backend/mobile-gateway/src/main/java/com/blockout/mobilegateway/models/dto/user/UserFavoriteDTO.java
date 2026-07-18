package com.blockout.mobilegateway.models.dto.user;

import com.blockout.shared.model.EntityTypeEnum;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserFavoriteDTO {
    private EntityTypeEnum entityType;

    private Long entityId;
}
