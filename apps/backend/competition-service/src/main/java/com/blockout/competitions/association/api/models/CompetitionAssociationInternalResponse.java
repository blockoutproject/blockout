package com.blockout.competitions.association.api.models;

import java.time.LocalDateTime;

/**
 * Complete handwritten internal representation of a competition association.
 */
public record CompetitionAssociationInternalResponse(
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
