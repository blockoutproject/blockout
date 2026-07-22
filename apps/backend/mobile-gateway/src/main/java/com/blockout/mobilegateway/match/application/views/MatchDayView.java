package com.blockout.mobilegateway.match.application.views;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchDayView {
    private String date;
    private List<PoolMatchesView> pools;
}
