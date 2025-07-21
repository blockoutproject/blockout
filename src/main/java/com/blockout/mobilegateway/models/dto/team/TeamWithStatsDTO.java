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

    private Integer pointsPenalty;

    private Double coefSets;

    private Double coefPoints;
}