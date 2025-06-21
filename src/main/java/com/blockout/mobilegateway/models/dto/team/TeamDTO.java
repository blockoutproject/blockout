package com.blockout.mobilegateway.models.dto.team;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.blockout.mobilegateway.models.enums.DivisionCode;
import com.blockout.mobilegateway.models.enums.Format;
import com.blockout.mobilegateway.models.enums.Gender;
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

    @JsonProperty("division_code")
    private DivisionCode divisionCode;

    private Format format;
    
    private Gender gender;

    @JsonProperty("followers_count")
    private Long followersCount;
}