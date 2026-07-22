package com.blockout.competitions.association.application.views;

import java.util.List;

/**
 * Represents one pool and its calculated team ranking.
 */
public record PoolWithRankingView(Long poolId, List<TeamRankingView> ranking) {
}
