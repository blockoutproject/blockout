package com.blockout.matches.models.dto.match;

import java.time.Instant;

import com.blockout.matches.models.enums.LiveLinkStatus;
import com.blockout.matches.models.enums.LiveProvider;

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

    private LiveProvider provider;

    private String url;

    private LiveLinkStatus status;

    private int reportCount;

    private String ownerAuth0Id;

    private Instant createdAt;

    private Instant lastUpdate;
}