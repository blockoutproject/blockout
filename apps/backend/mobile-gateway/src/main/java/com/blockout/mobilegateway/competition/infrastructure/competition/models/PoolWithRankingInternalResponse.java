package com.blockout.mobilegateway.competition.infrastructure.competition.models;

import java.util.List;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolWithRankingInternalResponse {
    private Long poolId;

    private List<TeamRankingInternalResponse> ranking;
}