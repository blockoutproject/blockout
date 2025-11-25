package com.blockout.teams.models.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.blockout.teams.models.enums.Format;
import com.blockout.teams.models.enums.Gender;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamUpdateDTO {

    @JsonProperty("club_id")
    private String clubId;

    @JsonProperty("raw_name")
    private String rawName;

    private String name;

    @JsonProperty("short_name")
    private String shortName;

    @JsonProperty("league_code")
    private String leagueCode;

    @JsonProperty("division_id")
    private Long divisionId;

    @JsonProperty("logo_url")
    private String logoUrl;

    private String season;

    private Format format;

    private Gender gender;

    private Boolean active;
}