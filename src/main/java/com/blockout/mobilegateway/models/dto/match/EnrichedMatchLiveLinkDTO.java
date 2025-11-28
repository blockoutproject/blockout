package com.blockout.mobilegateway.models.dto.match;

import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrichedMatchLiveLinkDTO {

    @JsonProperty("live_link_id")
    private Long liveLinkId;

    @JsonProperty("match_id")
    private Long matchId;

    @JsonProperty("match_date")
    private String matchDate;

    private String season;

    private String set;

    private String score;

    @JsonProperty("team_a")
    private TeamDTO teamA;

    @JsonProperty("team_b")
    private TeamDTO teamB;

    @JsonProperty("pool_name")
    private String poolName;

    @JsonProperty("division_name")
    private String divisionName;

    @JsonProperty("league_name")
    private String leagueName;

    @JsonProperty("live_url")
    private String liveUrl;

    @JsonProperty("live_owner_auth0_id")
    private String liveOwnerAuth0Id;

    @JsonProperty("live_owner_username")
    private String liveOwnerUsername;
}