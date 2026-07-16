package com.blockout.competitions.models.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamRankingDTO {
    @JsonProperty("team_id")
    private Long teamId;
    private Integer points;

    @JsonProperty("points_penalty")
    private Integer pointsPenalty;
    private Integer played;
    private Integer wins;
    private Integer losses;

    @JsonProperty("coef_sets")
    private Double coefSets;

    @JsonProperty("coef_points")
    private Double coefPoints;
}