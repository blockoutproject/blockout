package com.blockout.mobilegateway.match.application.views;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MatchDayData {
    private String date;
    private List<PoolMatchesData> pools;
}
