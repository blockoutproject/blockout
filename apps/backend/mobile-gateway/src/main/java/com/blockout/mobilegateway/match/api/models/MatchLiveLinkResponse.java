package com.blockout.mobilegateway.match.api.models;

import com.blockout.mobilegateway.team.api.models.TeamInternalResponse;
import com.fasterxml.jackson.annotation.JsonInclude;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchLiveLinkResponse {

    private Long liveLinkId;

    private Long matchId;

    private String matchDate;

    private String season;

    private String set;

    private String score;

    private TeamInternalResponse teamA;

    private TeamInternalResponse teamB;

    private String poolName;

    private String divisionName;

    private String leagueName;

    private String liveUrl;

    private String liveOwnerAuth0Id;

    private String liveOwnerUsername;
}