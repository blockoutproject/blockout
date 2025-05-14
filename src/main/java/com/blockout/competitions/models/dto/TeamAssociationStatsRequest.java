package com.blockout.competitions.models.dto;
import lombok.Data;

@Data
public class TeamAssociationStatsRequest {
    private Integer played;
    private Integer wins;
    private Integer losses;
    private Integer points;
    private Integer winsThreeToZero;
    private Integer winsThreeToOne;
    private Integer winsThreeToTwo;
    private Integer lossesZeroToThree;
    private Integer lossesOneToThree;
    private Integer lossesTwoToThree;
    private Integer wonSets;
    private Integer lostSets;
    private Integer wonPoints;
    private Integer lostPoints;
    private Integer pointsPenalty;
    private Double coefSets;
    private Double coefPoints;
}