package com.blockout.competitions.models.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolWithRankingDTO {
    @JsonProperty("pool_id")
    private Long poolId;
    
    private List<TeamRankingDTO> ranking;
}