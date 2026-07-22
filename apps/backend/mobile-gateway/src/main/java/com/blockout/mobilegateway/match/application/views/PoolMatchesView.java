package com.blockout.mobilegateway.match.application.views;

import com.blockout.mobilegateway.pool.application.views.PoolView;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolMatchesView {
    private PoolView pool;
    private List<MatchView> matches;
}
