package com.blockout.mobilegateway.competition.infrastructure.competition.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolWithRankingInternalResponse {
    private Long poolId;

    private List<TeamRankingInternalResponse> ranking;
}
