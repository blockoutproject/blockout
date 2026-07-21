package com.blockout.competitions.association.application.views;

import java.time.LocalDateTime;

/**
 * Application read model for the complete owned association resource.
 */
public record CompetitionAssociationView(
    Long id,
    Long poolId,
    Long teamId,
    String clubId,
    Boolean active,
    Integer points,
    Integer played,
    Integer wins,
    Integer losses,
    Integer winsThreeToZero,
    Integer winsThreeToOne,
    Integer winsThreeToTwo,
    Integer lossesZeroToThree,
    Integer lossesOneToThree,
    Integer lossesTwoToThree,
    Integer wonSets,
    Integer lostSets,
    Integer wonPoints,
    Integer lostPoints,
    Integer pointsPenalty,
    Double coefSets,
    Double coefPoints,
    LocalDateTime createdAt,
    LocalDateTime lastUpdate) {
}
