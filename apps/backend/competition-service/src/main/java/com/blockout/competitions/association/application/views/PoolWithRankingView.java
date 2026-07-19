package com.blockout.competitions.association.application.views;

import java.util.List;

public record PoolWithRankingView(Long poolId, List<TeamRankingView> ranking) {
}
