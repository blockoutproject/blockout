package com.blockout.mobilegateway.models.dto.team;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    @JsonProperty("league_code")
    private String leagueCode;

    @JsonProperty("division_id")
    private Long divisionId;

    private Format format;
    
    private Gender gender;

    private String season;

    @JsonProperty("followers_count")
    private Long followersCount;

    @JsonProperty("logo_url")
    private String logoUrl; // URL du logo de l'équipe spécialement intégré

    private Boolean active;

    @JsonProperty("created_at")
    private String createdAt;

    @JsonProperty("last_update")
    private String lastUpdate;
}