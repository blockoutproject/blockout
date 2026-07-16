package com.blockout.mobilegateway.models.dto.match;

import java.time.Instant;

import com.blockout.mobilegateway.models.dto.pool.EnrichedPoolDTO;
import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.blockout.mobilegateway.models.enums.LiveLinkStatus;
import com.blockout.mobilegateway.models.enums.LiveProvider;
import com.blockout.mobilegateway.models.enums.MatchStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

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

    @JsonProperty("match_date")
    private Instant matchDate;

    private String season;
    private String set;
    private String score;

    private MatchStatus status;

    @JsonProperty("live_code")
    private Long liveCode;

    @JsonProperty("last_live_link_id")
    private Long lastLiveLinkId;

    @JsonProperty("last_live_link_status")
    private LiveLinkStatus lastLiveLinkStatus;

    @JsonProperty("last_live_link_provider")
    private LiveProvider lastLiveLinkProvider;

    @JsonProperty("last_live_link_url")
    private String lastLiveLinkUrl;

    @JsonProperty("last_live_link_owner_auth0_id")
    private String lastLiveLinkOwnerAuth0Id;

    @JsonProperty("last_live_link_created_at")
    private Instant lastLiveLinkCreatedAt;

    @JsonProperty("team_a")
    private TeamDTO teamA;

    @JsonProperty("team_b")
    private TeamDTO teamB;

    private EnrichedPoolDTO pool;
}