package com.blockout.mobilegateway.models.dto.competition;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompetitionAssociationDTO {
    private Long id;

    @JsonProperty("pool_id")
    private Long poolId;

    @JsonProperty("team_id")
    private Long teamId;

    @JsonProperty("club_id")
    private String clubId;

    private Boolean active;

    private Integer points;
    private Integer played;
    private Integer wins;
    private Integer losses;

    @JsonProperty("wins_three_to_zero")
    private Integer winsThreeToZero;

    @JsonProperty("wins_three_to_one")
    private Integer winsThreeToOne;

    @JsonProperty("wins_three_to_two")
    private Integer winsThreeToTwo;

    @JsonProperty("losses_zero_to_three")
    private Integer lossesZeroToThree;

    @JsonProperty("losses_one_to_three")
    private Integer lossesOneToThree;

    @JsonProperty("losses_two_to_three")
    private Integer lossesTwoToThree;

    @JsonProperty("won_sets")
    private Integer wonSets;

    @JsonProperty("lost_sets")
    private Integer lostSets;

    @JsonProperty("won_points")
    private Integer wonPoints;

    @JsonProperty("lost_points")
    private Integer lostPoints;

    @JsonProperty("points_penalty")
    private Integer pointsPenalty;

    @JsonProperty("coef_sets")
    private Double coefSets;

    @JsonProperty("coef_points")
    private Double coefPoints;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @JsonProperty("last_update")
    private LocalDateTime lastUpdate;
}