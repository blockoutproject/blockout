package com.blockout.competitions.models.dto;
import lombok.Data;

@Data
public class TeamAssociationStatsRequest {
    private Integer played;
    private Integer wins;
    private Integer losses;
    private Integer points;
    private Integer wins3To0;
    private Integer wins3To1;
    private Integer wins3To2;
    private Integer losses0To3;
    private Integer losses1To3;
    private Integer losses2To3;
    private Integer wonSets;
    private Integer lostSets;
    private Integer wonPoints;
    private Integer lostPoints;
    private Integer pointsPenalty;
    private Double coefSets;
    private Double coefPoints;
}