package com.blockout.notifications.notification.infrastructure.messaging.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchFinishedEvent {
    private Long id;
    private Long teamIdA;
    private Long teamIdB;
    private Long poolId;
    private String set;
}
