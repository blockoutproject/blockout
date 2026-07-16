package com.blockout.mobilegateway.models.dto.match;

import java.time.Instant;

import com.blockout.mobilegateway.models.enums.LiveLinkStatus;
import com.blockout.mobilegateway.models.enums.LiveProvider;
import com.blockout.mobilegateway.models.enums.MatchStatus;
import com.fasterxml.jackson.annotation.JsonProperty;

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

    @JsonProperty("match_code")
    private String matchCode;

    @JsonProperty("league_code")
    private String leagueCode;

    @JsonProperty("pool_id")
    private Long poolId;

    @JsonProperty("team_id_a")
    private Long teamIdA;

    @JsonProperty("team_id_b")
    private Long teamIdB;

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
}