package com.blockout.mobilegateway.competition.application.views;

/**
 * Supplies one team ranking entry required by gateway aggregation.
 *
 * @param teamId ranked team identifier.
 * @param points ranking points.
 * @param pointsPenalty ranking penalty.
 * @param played played match count.
 * @param wins win count.
 * @param losses loss count.
 * @param coefSets set coefficient.
 * @param coefPoints point coefficient.
 */
public record TeamRankingView(
    Long teamId,
    Integer points,
    Integer pointsPenalty,
    Integer played,
    Integer wins,
    Integer losses,
    Double coefSets,
    Double coefPoints) {
}
