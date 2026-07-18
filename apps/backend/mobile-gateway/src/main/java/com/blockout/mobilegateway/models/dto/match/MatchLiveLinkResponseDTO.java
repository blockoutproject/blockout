package com.blockout.mobilegateway.models.dto.match;

import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.LiveProviderEnum;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchLiveLinkResponseDTO {

    private Long matchId;

    private LiveProviderEnum provider;
    private String url;
    private LiveLinkStatusEnum status;

    private int reportCount;

    private String ownerAuth0Id;
}
