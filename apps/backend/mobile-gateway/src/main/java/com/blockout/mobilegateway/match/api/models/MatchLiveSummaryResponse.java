package com.blockout.mobilegateway.match.api.models;

import com.blockout.mobilegateway.pool.api.models.PoolResponse;
import com.blockout.mobilegateway.shared.application.models.LiveLinkStatus;
import com.blockout.mobilegateway.shared.application.models.LiveProvider;
import com.blockout.mobilegateway.shared.application.models.MatchStatus;
import com.blockout.mobilegateway.team.api.models.TeamInternalResponse;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchLiveSummaryResponse {

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

    private TeamInternalResponse teamA;

    private TeamInternalResponse teamB;

    private PoolResponse pool;
}
