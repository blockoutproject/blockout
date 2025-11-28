package com.blockout.mobilegateway.models.dto.match;

import com.blockout.mobilegateway.models.enums.LiveProvider;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchLiveLinkDTO {

    @JsonProperty("live_link_id")
    private Long liveLinkId;

    @JsonProperty("match_id")
    private Long matchId;

    @JsonProperty("match_code")
    private String matchCode;

    @JsonProperty("league_code")
    private String leagueCode;

    @JsonProperty("pool_id")
    private Long poolId;

    @JsonProperty("live_code")
    private Long liveCode;

    @JsonProperty("team_id_a")
    private Long teamIdA;

    @JsonProperty("team_id_b")
    private Long teamIdB;

    @JsonProperty("match_date")
    private String matchDate;

    private String season;

    private String set;

    private String score;

    private String status;

    private String venue;

    @JsonProperty("first_referee")
    private String firstReferee;

    @JsonProperty("second_referee")
    private String secondReferee;

    @JsonProperty("live_url")
    private String liveUrl;

    @JsonProperty("live_provider")
    private LiveProvider liveProvider;

    @JsonProperty("live_owner_auth0_id")
    private String liveOwnerAuth0Id;

    @JsonProperty("live_edit_locked")
    private Boolean liveEditLocked;
}