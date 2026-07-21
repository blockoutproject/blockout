package com.blockout.mobilegateway.match.api.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DayMatchesResponse {
    private String date;
    private List<PoolMatchesResponse> pools;
}
