package com.blockout.mobilegateway.match.api.models;

import com.blockout.mobilegateway.shared.application.models.LiveLinkStatus;
import com.blockout.mobilegateway.shared.application.models.LiveProvider;
import com.blockout.mobilegateway.shared.application.models.MatchStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchLiveSummaryInternalResponse {

    private Long id;

    private String matchCode;

    private String leagueCode;

    private Long poolId;

    private Long teamIdA;

    private Long teamIdB;

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
}
