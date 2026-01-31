package com.blockout.mobilegateway.models.dto.team;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamWithStatsDTO {
    private Long id;

    private String name;

    @JsonProperty("short_name")
    private String shortName;

    @JsonProperty("logo_url")
    private String logoUrl;

    private Integer points;

    private Integer played;

    private Integer wins;

    private Integer losses;

    @JsonProperty("points_penalty")
    private Integer pointsPenalty;

    private Double longitude;

    private Double latitude;

    @JsonProperty("coef_sets")
    private Double coefSets;

    @JsonProperty("coef_points")
    private Double coefPoints;
}