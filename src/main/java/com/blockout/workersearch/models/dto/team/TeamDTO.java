package com.blockout.workersearch.models.dto.team;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.blockout.workersearch.models.enums.Format;
import com.blockout.workersearch.models.enums.Gender;
import com.fasterxml.jackson.annotation.JsonProperty;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamDTO {
    private Long id;

    @JsonProperty("club_id")
    private String clubId;

    @JsonProperty("raw_name")
    private String rawName;

    private String name;

    @JsonProperty("short_name")
    private String shortName;

    private String season;

    @JsonProperty("last_update")
    private String lastUpdate;

    @JsonProperty("league_code")
    private String leagueCode;

    @JsonProperty("division_id")
    private Long divisionId;

    private Format format;

    private Gender gender;

    @JsonProperty("followers_count")
    private Long followersCount;

    @JsonProperty("logo_url")
    private String logoUrl;

    private Boolean active;
}