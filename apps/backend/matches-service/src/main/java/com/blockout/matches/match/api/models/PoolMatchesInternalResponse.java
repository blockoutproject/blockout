package com.blockout.matches.match.api.models;

import java.util.List;

public record PoolMatchesInternalResponse(Long poolId, List<MatchInternalResponse> matches) {
}
