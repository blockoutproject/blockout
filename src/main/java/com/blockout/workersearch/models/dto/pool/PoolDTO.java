package com.blockout.workersearch.models.dto.pool;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolDTO {
    private Long id;

    @JsonProperty("pool_code")
    private String poolCode;

    @JsonProperty("league_code")
    private String leagueCode;

    private Integer season;

    @JsonProperty("league_name")
    private String leagueName;

    private String name;

    @JsonProperty("division_code")
    private String divisionCode;

    @JsonProperty("division_name")
    private String divisionName;

    private String format;
    private String gender;

    @JsonProperty("raw_division_name")
    private String rawDivisionName;

    @JsonProperty("followers_count")
    private Long followersCount;

    private Boolean active;

    @JsonProperty("last_update")
    private String lastUpdate;
}