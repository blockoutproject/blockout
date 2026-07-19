package com.blockout.matches.models.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchLiveLinkCreatedEvent {
    private Long id;
    private Long teamIdA;
    private Long teamIdB;
    private Long poolId;
}