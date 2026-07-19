package com.blockout.mobilegateway.match.api.models;

import java.util.List;

import com.blockout.mobilegateway.pool.api.models.PoolResponse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolMatchesResponse {
    private PoolResponse pool;
    private List<MatchResponse> matches;
}
