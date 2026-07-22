package com.blockout.mobilegateway.match.application.views;

import com.blockout.mobilegateway.shared.application.models.LiveLinkStatus;
import com.blockout.mobilegateway.shared.application.models.LiveProvider;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpsertMatchLiveLinkView {

    private Long matchId;

    private LiveProvider provider;
    private String url;
    private LiveLinkStatus status;

    private int reportCount;

    private String ownerAuth0Id;
}
