package com.blockout.mobilegateway.team.api.models;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamWithStatsResponse {
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