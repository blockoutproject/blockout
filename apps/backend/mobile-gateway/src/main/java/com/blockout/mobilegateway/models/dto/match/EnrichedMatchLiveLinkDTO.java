package com.blockout.mobilegateway.models.dto.match;

import com.blockout.mobilegateway.models.dto.team.TeamDTO;
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
public class EnrichedMatchLiveLinkDTO {

    private Long liveLinkId;

    private Long matchId;

    private String matchDate;

    private String season;

    private String set;

    private String score;

    private TeamDTO teamA;

    private TeamDTO teamB;

    private String poolName;

    private String divisionName;

    private String leagueName;

    private String liveUrl;

    private String liveOwnerAuth0Id;

    private String liveOwnerUsername;
}
