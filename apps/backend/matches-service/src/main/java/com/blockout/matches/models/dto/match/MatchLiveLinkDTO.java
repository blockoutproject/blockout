package com.blockout.matches.models.dto.match;

import java.time.Instant;

import com.blockout.matches.models.enums.LiveLinkStatus;
import com.blockout.matches.models.enums.LiveProvider;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchLiveLinkDTO {

    private Long id;

    @JsonProperty("match_id")
    private Long matchId;

    private LiveProvider provider;

    private String url;

    private LiveLinkStatus status;

    @JsonProperty("report_count")
    private int reportCount;

    @JsonProperty("owner_auth0_id")
    private String ownerAuth0Id;

    @JsonProperty("created_at")
    private Instant createdAt;

    @JsonProperty("last_update")
    private Instant lastUpdate;
}