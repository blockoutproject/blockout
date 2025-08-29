package com.blockout.users.models.events;

import java.io.Serializable;

import com.blockout.users.models.enums.EntityType;
import com.blockout.users.models.enums.EventType;

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
    private EntityType entityType;
    private Long entityId;
    private EventType eventType;
}