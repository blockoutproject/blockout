package com.blockout.mobilegateway.competition.application.views;

import java.util.List;

/**
 * Supplies the ranking attached to one pool for gateway aggregation.
 *
 * @param poolId ranked pool identifier.
 * @param ranking ordered team ranking entries.
 */
public record PoolRankingView(Long poolId, List<TeamRankingView> ranking) {
}
