package com.blockout.workersearch.models.dto.team;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.fasterxml.jackson.annotation.JsonProperty;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamDTO {
    private Long id;

    @JsonProperty("club_id")
    private String clubId;

    private String name;

    @JsonProperty("short_name")
    private String shortName;

    private Boolean active;

    @JsonProperty("last_update")
    private String lastUpdate;

    @JsonProperty("league_code")
    private String leagueCode;

    @JsonProperty("division_name")
    private String divisionName;

    private String format;
    
    private String gender;

    @JsonProperty("followers_count")
    private Long followersCount;
}