package com.blockout.mobilegateway.models.dto.match;

import java.time.Instant;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.AllArgsConstructor;
import lombok.Builder;

import com.blockout.mobilegateway.models.enums.LiveProvider;
import com.blockout.mobilegateway.models.enums.MatchStatus;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchDTO {
    private Long id;

    private String matchCode;

    private String leagueCode;

    private Long poolId;

    private Long liveCode;

    private Long teamIdA;

    private Long teamIdB;

    private Instant matchDate;

    private String season;

    private String set;

    private String score;

    private MatchStatus status;

    private String venue;

    private String firstReferee;

    private String secondReferee;

    private Boolean active;

    private Instant createdAt;

    private Instant lastUpdate;

    private String liveUrl;

    private LiveProvider liveProvider;

    private String liveOwnerAuth0Id;
}
