package com.blockout.mobilegateway.models.dto.team;

import com.blockout.mobilegateway.models.enums.Format;
import com.blockout.mobilegateway.models.enums.Gender;
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

    private Format format;

    private Gender gender;

    private String season;

    @JsonProperty("followers_count")
    private Long followersCount;

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