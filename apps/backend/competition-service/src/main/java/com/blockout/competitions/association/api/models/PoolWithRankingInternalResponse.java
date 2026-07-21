package com.blockout.competitions.association.api.models;

import java.util.List;

/**
 * Purpose-specific pool ranking projection.
 */
public record PoolWithRankingInternalResponse(Long poolId, List<TeamRankingInternalResponse> ranking) {
}
