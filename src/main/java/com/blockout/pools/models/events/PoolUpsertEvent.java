package com.blockout.pools.models.events;

import com.blockout.pools.models.enums.Format;
import com.blockout.pools.models.enums.Gender;

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
    private String shortName;
    private Long divisionId;
    private String leagueCode;
    private String leagueName;
    private String season;
    private Format format;
    private Gender gender;
}
