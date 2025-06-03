package com.blockout.mobilegateway.models.dto.match;

import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrichedMatchDTO {
    private Long id;

    @JsonProperty("match_code")
    private String matchCode;

    @JsonProperty("league_code")
    private String leagueCode;

    @JsonProperty("pool_id")
    private Long poolId;

    @JsonProperty("team_id_a")
    private Long teamIdA;

    @JsonProperty("team_id_b")
    private Long teamIdB;

    @JsonProperty("match_date")
    private String matchDate;

    private String status;
    private String set;
    private String score;
    private String venue;

    @JsonProperty("referee_1")
    private String referee1;

    @JsonProperty("referee_2")
    private String referee2;

    @JsonProperty("live_code")
    private Long liveCode;

    @JsonProperty("last_update")
    private String lastUpdate;
    private boolean active;

    @JsonProperty("team_a")
    private TeamDTO teamA;

    @JsonProperty("team_b")
    private TeamDTO teamB;
}