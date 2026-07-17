package com.blockout.mobilegateway.models.dto.competition;

import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompetitionAssociationDTO {
    private Long id;

    private Long poolId;

    private Long teamId;

    private String clubId;

    private Boolean active;

    private Integer points;
    private Integer played;
    private Integer wins;
    private Integer losses;

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

    private LocalDateTime createdAt;

    private LocalDateTime lastUpdate;
}
