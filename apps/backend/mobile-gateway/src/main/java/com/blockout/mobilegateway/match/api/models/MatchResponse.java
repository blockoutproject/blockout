package com.blockout.mobilegateway.match.api.models;

import java.time.Instant;

import com.blockout.mobilegateway.pool.api.models.PoolResponse;
import com.blockout.mobilegateway.team.api.models.TeamInternalResponse;
import com.blockout.mobilegateway.shared.application.models.LiveProvider;
import com.blockout.mobilegateway.shared.application.models.MatchStatus;
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
public class MatchResponse {
    private Long id;

    private Long liveCode;

    private Instant matchDate;

    private String season;

    private String set;

    private String score;

    private MatchStatus status;

    private String venue;

    private String firstReferee;

    private String secondReferee;

    private String liveUrl;

    private LiveProvider liveProvider;

    private String liveOwnerAuth0Id;

    private TeamInternalResponse teamA;

    private TeamInternalResponse teamB;

    private String matchAddressPdfUrl;

    private String matchSheetPdfUrl;

    private PoolResponse pool;
}
