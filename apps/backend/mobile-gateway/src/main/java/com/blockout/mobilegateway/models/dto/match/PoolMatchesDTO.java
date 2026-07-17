package com.blockout.mobilegateway.models.dto.match;

import java.util.List;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PoolMatchesDTO {
    private Long poolId;

    private List<MatchDTO> matches;
}
