package com.blockout.pools.models.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolUpsertEvent {
    private Long id;
    private String name;
    private Long divisionId;
    private String leagueName;
    private String season;
}
