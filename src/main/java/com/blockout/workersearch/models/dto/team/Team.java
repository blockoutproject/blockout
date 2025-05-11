package com.blockout.workersearch.models.dto.team;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Team {

    private Long id;

    @JsonProperty("club_id")
    private String clubId;

    private String name;

    @JsonProperty("short_name")
    private String shortName;

    private Boolean active;

    @JsonProperty("last_update")
    private LocalDateTime lastUpdate;

    @JsonProperty("league_code")
    private String leagueCode;

    @JsonProperty("division_name")
    private String divisionName;

    private TeamFormat format;

    private TeamGender gender;

    @JsonProperty("followers_count")
    private Long followersCount;
}