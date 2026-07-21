package com.blockout.competitions.association.api.models;

/**
 * Replaces every stored statistic for one pool-team association.
 */
public record UpdateAssociationStatsInternalRequest(
    Integer played,
    Integer wins,
    Integer losses,
    Integer points,
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
    Double coefPoints) {
}
