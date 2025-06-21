package com.blockout.mobilegateway.models.dto.match;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import com.fasterxml.jackson.annotation.JsonProperty;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchDTO {
    private Long id;

    @JsonProperty("match_code")
    private String matchCode;

    @JsonProperty("league_code")
    private String leagueCode;

    @JsonProperty("pool_id")
    private Long poolId;

    @JsonProperty("live_code")
    private Long liveCode;

    @JsonProperty("team_id_a")
    private Long teamIdA;

    @JsonProperty("team_id_b")
    private Long teamIdB;

    @JsonProperty("match_date")
    private String matchDate;

    private String set;

    private String score;

    private String status;
    
    private String venue;

    @JsonProperty("referee_1")
    private String referee1;

    @JsonProperty("referee_2")
    private String referee2;
    
    private Boolean active;

    @JsonProperty("last_update")
    private String lastUpdate;

}