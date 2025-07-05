package com.blockout.mobilegateway.models.dto.match;

import java.util.List;

import com.blockout.mobilegateway.models.dto.pool.EnrichedPoolDTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrichedPoolMatchesDTO {
    private EnrichedPoolDTO pool;
    
    private List<EnrichedMatchDTO> matches;
}
