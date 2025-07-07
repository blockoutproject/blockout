package com.blockout.mobilegateway.models.dto.competition;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolWithRankingDTO {
    private Long poolId;
    private List<TeamRankingDTO> ranking;
}