package com.blockout.mobilegateway.models.dto.match;

import java.util.List;

import com.blockout.mobilegateway.models.dto.pool.PoolDTO;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrichedPoolMatchesDTO {
    @JsonProperty("pool_id")
    private Long poolId;

    @JsonProperty("pool_data")
    private PoolDTO poolData;
    
    private List<EnrichedMatchDTO> matches;
}
