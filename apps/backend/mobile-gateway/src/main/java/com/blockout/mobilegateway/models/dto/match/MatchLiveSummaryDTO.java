package com.blockout.mobilegateway.models.dto.match;

import java.time.Instant;

import com.blockout.mobilegateway.models.enums.LiveLinkStatus;
import com.blockout.mobilegateway.models.enums.LiveProvider;
import com.blockout.mobilegateway.models.enums.MatchStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchLiveSummaryDTO {

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