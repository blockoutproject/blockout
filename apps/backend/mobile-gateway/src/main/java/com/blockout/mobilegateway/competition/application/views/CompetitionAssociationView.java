package com.blockout.mobilegateway.competition.application.views;

/**
 * Supplies association statistics required by gateway ranking assembly.
 *
 * @param teamId associated team identifier.
 * @param points ranking points.
 * @param played played match count.
 * @param wins win count.
 * @param losses loss count.
 * @param pointsPenalty ranking penalty.
 * @param coefSets set coefficient.
 * @param coefPoints point coefficient.
 */
public record CompetitionAssociationView(
    Long teamId,
    Integer points,
    Integer played,
    Integer wins,
    Integer losses,
    Integer pointsPenalty,
    Double coefSets,
    Double coefPoints) {
}
