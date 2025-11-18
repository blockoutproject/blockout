package com.blockout.matches.models.dto.match;

import java.time.LocalDateTime;

import com.blockout.matches.models.enums.LiveProvider;
import com.blockout.matches.models.enums.MatchStatus;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class MatchDTO {
    private Long id;
    private String matchCode;
    private String leagueCode;
    private Long poolId;
    private Long liveCode;
    private Long teamIdA;
    private Long teamIdB;
    private LocalDateTime matchDate;
    private String season;
    private String set;
    private String score;
    private MatchStatus status;
    private String venue;
    private String firstReferee;
    private String secondReferee;
    private String liveUrl;
    private LiveProvider liveProvider;
    private String liveOwnerAuth0Id;
    private Boolean liveEditLocked;
}
