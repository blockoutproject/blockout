package com.blockout.mobilegateway.match.api.models;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PoolMatchesInternalResponse {
    private Long poolId;

    private List<MatchInternalResponse> matches;
}
