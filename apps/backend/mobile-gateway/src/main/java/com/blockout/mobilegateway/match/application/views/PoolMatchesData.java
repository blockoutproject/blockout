package com.blockout.mobilegateway.match.application.views;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PoolMatchesData {
    private Long poolId;

    private List<MatchData> matches;
}
