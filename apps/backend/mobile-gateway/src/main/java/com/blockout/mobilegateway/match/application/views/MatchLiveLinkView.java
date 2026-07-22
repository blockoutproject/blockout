package com.blockout.mobilegateway.match.application.views;

import com.blockout.mobilegateway.shared.application.models.LiveLinkStatus;
import com.blockout.mobilegateway.shared.application.models.LiveProvider;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchLiveLinkView {

    private Long id;

    private Long matchId;

    private LiveProvider provider;

    private String url;

    private LiveLinkStatus status;

    private int reportCount;

    private String ownerAuth0Id;

    private Instant createdAt;

    private Instant lastUpdate;
}
