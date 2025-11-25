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
    Long matchId;

    LiveProvider provider;
    String url;
    LiveLinkStatus status;
}