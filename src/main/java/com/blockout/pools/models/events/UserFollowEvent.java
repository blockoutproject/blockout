package com.blockout.pools.models.events;

import java.io.Serializable;

import com.blockout.pools.models.EntityType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserFollowEvent implements Serializable {
    public enum EventType {
        CREATED,
        DELETED
    }

    private Long userId;
    private EntityType entityType;
    private Long entityId;
    private EventType eventType;
}