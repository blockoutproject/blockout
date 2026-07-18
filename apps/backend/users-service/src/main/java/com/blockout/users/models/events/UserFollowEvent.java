package com.blockout.users.models.events;

import java.io.Serializable;

import com.blockout.shared.model.EntityTypeEnum;
import com.blockout.shared.model.EntityEventActionEnum;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserFollowEvent implements Serializable {
    private Long userId;
    private EntityTypeEnum entityType;
    private Long entityId;
    private EntityEventActionEnum eventType;
}
