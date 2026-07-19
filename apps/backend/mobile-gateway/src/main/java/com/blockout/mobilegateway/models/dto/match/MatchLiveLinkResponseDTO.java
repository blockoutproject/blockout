package com.blockout.mobilegateway.models.dto.match;

import com.blockout.mobilegateway.models.enums.LiveLinkStatus;
import com.blockout.mobilegateway.models.enums.LiveProvider;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchLiveLinkResponseDTO {

    private Long matchId;

    private LiveProvider provider;
    private String url;
    private LiveLinkStatus status;

    private int reportCount;

    private String ownerAuth0Id;
}