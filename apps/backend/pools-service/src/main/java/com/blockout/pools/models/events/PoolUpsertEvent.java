package com.blockout.pools.models.events;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Historic v1 outbox payload; keep this class name stable for pending rows and rollback readers. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolUpsertEvent {
    private Long id;
    private String name;
    private String shortName;
    private Long divisionId;
    private String leagueCode;
    private String leagueName;
    private String season;
    private FormatEnum format;
    private GenderEnum gender;
}
