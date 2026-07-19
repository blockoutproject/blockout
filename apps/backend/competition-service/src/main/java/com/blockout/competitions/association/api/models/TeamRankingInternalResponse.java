package com.blockout.competitions.association.api.models;

/** Purpose-specific ranking entry, not a complete Team representation. */
public record TeamRankingInternalResponse(
        Long teamId,
        Integer points,
        Integer pointsPenalty,
        Integer played,
        Integer wins,
        Integer losses,
        Double coefSets,
        Double coefPoints) {
}
