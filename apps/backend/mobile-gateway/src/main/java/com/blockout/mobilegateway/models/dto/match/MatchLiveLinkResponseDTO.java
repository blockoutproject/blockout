package com.blockout.mobilegateway.models.dto.match;

import com.blockout.mobilegateway.models.enums.LiveLinkStatus;
import com.blockout.mobilegateway.models.enums.LiveProvider;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchLiveLinkResponseDTO {

    @JsonProperty("match_id")
    private Long matchId;

    private LiveProvider provider;
    private String url;
    private LiveLinkStatus status;

    @JsonProperty("report_count")
    private int reportCount;

    @JsonProperty("owner_auth0_id")
    private String ownerAuth0Id;
}