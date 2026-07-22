package com.blockout.mobilegateway.team.application.views;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamWithStatsView {
    private Long id;

    private String name;

    private String shortName;

    private String logoUrl;

    private Integer points;

    private Integer played;

    private Integer wins;

    private Integer losses;

    private Integer pointsPenalty;

    private Double longitude;

    private Double latitude;

    private Double coefSets;

    private Double coefPoints;
}
