package com.blockout.mobilegateway.match.api.models;

import java.util.List;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PoolMatchesInternalResponse {
    private Long poolId;

    private List<MatchInternalResponse> matches;
}