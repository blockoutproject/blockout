package com.blockout.mobilegateway.match.api.models;

import com.blockout.mobilegateway.pool.api.models.PoolResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolMatchesResponse {
    private PoolResponse pool;
    private List<MatchResponse> matches;
}
