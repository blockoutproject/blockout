package com.blockout.mobilegateway.match.application.views;

import com.blockout.mobilegateway.pool.application.views.PoolView;
import com.blockout.mobilegateway.shared.application.models.LiveLinkStatus;
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
public class MatchLiveSummaryView {

    private Long id;

    private Instant matchDate;

    private String season;
    private String set;
    private String score;

    private MatchStatus status;

    private Long liveCode;

    private Long lastLiveLinkId;

    private LiveLinkStatus lastLiveLinkStatus;

    private LiveProvider lastLiveLinkProvider;

    private String lastLiveLinkUrl;

    private String lastLiveLinkOwnerAuth0Id;

    private Instant lastLiveLinkCreatedAt;

    private TeamDetailsView teamA;

    private TeamDetailsView teamB;

    private PoolView pool;
}
