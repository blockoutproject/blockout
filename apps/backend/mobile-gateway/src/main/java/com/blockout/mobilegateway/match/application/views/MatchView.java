package com.blockout.mobilegateway.match.application.views;

import com.blockout.mobilegateway.pool.application.views.PoolView;
import com.blockout.mobilegateway.shared.application.models.LiveProvider;
import com.blockout.mobilegateway.shared.application.models.MatchStatus;
import com.blockout.mobilegateway.team.application.views.TeamDetailsView;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchView {
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

    private TeamDetailsView teamA;

    private TeamDetailsView teamB;

    private String matchAddressPdfUrl;

    private String matchSheetPdfUrl;

    private PoolView pool;
}
