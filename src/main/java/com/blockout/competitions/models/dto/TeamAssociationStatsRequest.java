package com.blockout.competitions.models.dto;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class TeamAssociationStatsRequest {

    @JsonProperty("played")
    private Integer played;

    @JsonProperty("wins")
    private Integer wins;

    @JsonProperty("losses")
    private Integer losses;

    @JsonProperty("points")
    private Integer points;

    @JsonProperty("wins_3_0")
    private Integer wins30;

    @JsonProperty("wins_3_1")
    private Integer wins31;

    @JsonProperty("wins_3_2")
    private Integer wins32;

    @JsonProperty("losses_0_3")
    private Integer losses03;

    @JsonProperty("losses_1_3")
    private Integer losses13;

    @JsonProperty("losses_2_3")
    private Integer losses23;

    @JsonProperty("won_sets")
    private Integer wonSets;

    @JsonProperty("lost_sets")
    private Integer lostSets;

    @JsonProperty("won_points")
    private Integer wonPoints;

    @JsonProperty("lost_points")
    private Integer lostPoints;

    @JsonProperty("coef_sets")
    private Double coefSets;

    @JsonProperty("coef_points")
    private Double coefPoints;
}