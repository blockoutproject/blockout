package com.blockout.mobilegateway.competition.infrastructure.competition.models;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamRankingInternalResponse {
    private Long teamId;
    private Integer points;

    private Integer pointsPenalty;
    private Integer played;
    private Integer wins;
    private Integer losses;

    private Double coefSets;

    private Double coefPoints;
}