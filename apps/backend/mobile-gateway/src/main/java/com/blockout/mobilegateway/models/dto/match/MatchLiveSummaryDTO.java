package com.blockout.mobilegateway.models.dto.match;

import java.time.Instant;

import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.LiveProviderEnum;
import com.blockout.shared.model.MatchStatusEnum;

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

    private MatchStatusEnum status;

    private Long liveCode;

    private Long lastLiveLinkId;

    private LiveLinkStatusEnum lastLiveLinkStatus;

    private LiveProviderEnum lastLiveLinkProvider;

    private String lastLiveLinkUrl;

    private String lastLiveLinkOwnerAuth0Id;

    private Instant lastLiveLinkCreatedAt;
}
