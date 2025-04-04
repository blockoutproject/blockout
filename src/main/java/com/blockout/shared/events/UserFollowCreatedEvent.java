package com.blockout.shared.events;

import java.io.Serializable;

import com.blockout.users.models.EntityType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserFollowCreatedEvent implements Serializable {
    private Long userId;
    private EntityType entityType;
    private Long entityId;
}