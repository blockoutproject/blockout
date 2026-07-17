package com.blockout.mobilegateway.models.dto.match;

import java.time.Instant;

import com.blockout.mobilegateway.models.dto.pool.EnrichedPoolDTO;
import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.blockout.mobilegateway.models.enums.LiveLinkStatus;
import com.blockout.mobilegateway.models.enums.LiveProvider;
import com.blockout.mobilegateway.models.enums.MatchStatus;
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
public class EnrichedMatchLiveSummaryDTO {

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

    private TeamDTO teamA;

    private TeamDTO teamB;

    private EnrichedPoolDTO pool;
}
