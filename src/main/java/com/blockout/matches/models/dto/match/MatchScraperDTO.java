package com.blockout.matches.models.dto.match;

import lombok.*;
import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchScraperDTO {
    private Long id;
    private String matchCode;
    private String leagueCode;
    private Long poolId;
    private Long teamIdA;
    private Long teamIdB;
    private Instant matchDate;
    private String season;
    private String status;
    private String set;
    private String score;
    private String venue;
    private String firstReferee;
    private String secondReferee;
    private Long liveCode;
    private Boolean active;
    private Instant createdAt;
    private Instant lastUpdate;
}