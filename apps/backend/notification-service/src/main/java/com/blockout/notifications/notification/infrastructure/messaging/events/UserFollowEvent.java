package com.blockout.notifications.notification.infrastructure.messaging.events;

import java.io.Serializable;

import com.blockout.notifications.notification.application.models.EntityType;

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
