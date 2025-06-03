package com.blockout.mobilegateway.models.dto.match;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PoolMatchesDTO {
    @JsonProperty("pool_id")
    private Long poolId;

    private List<MatchDTO> matches;
}