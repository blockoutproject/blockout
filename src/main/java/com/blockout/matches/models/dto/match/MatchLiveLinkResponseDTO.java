package com.blockout.matches.models.dto.match;

import com.blockout.matches.models.enums.LiveLinkStatus;
import com.blockout.matches.models.enums.LiveProvider;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class MatchLiveLinkResponseDTO {
    private Long matchId;
    private LiveProvider provider;
    private String url;
    private LiveLinkStatus status;
    private int reportCount;
    private String ownerAuth0Id;
}