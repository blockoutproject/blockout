package com.blockout.mobilegateway.models.dto.match;

import java.time.Instant;

import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.LiveProviderEnum;

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

    private Long matchId;

    private LiveProviderEnum provider;

    private String url;

    private LiveLinkStatusEnum status;

    private int reportCount;

    private String ownerAuth0Id;

    private Instant createdAt;

    private Instant lastUpdate;
}
