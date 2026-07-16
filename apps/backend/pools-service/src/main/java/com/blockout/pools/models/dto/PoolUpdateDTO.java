package com.blockout.pools.models.dto;

import com.blockout.pools.models.enums.Format;
import com.blockout.pools.models.enums.Gender;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolUpdateDTO {

    @JsonProperty("pool_code")
    private String poolCode;

    @JsonProperty("league_code")
    private String leagueCode;

    private String season;

    @JsonProperty("league_name")
    private String leagueName;

    @JsonProperty("raw_name")
    private String rawName;

    private String name;

    @JsonProperty("short_name")
    private String shortName;

    @JsonProperty("division_id")
    private Long divisionId;

    private Format format;

    private Gender gender;

    private Boolean active;
}