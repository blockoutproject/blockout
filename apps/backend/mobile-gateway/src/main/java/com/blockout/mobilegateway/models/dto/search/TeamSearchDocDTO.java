package com.blockout.mobilegateway.models.dto.search;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class TeamSearchDocDTO {
    private Long id;
    private String name;

    @JsonProperty("short_name")
    private String shortName;

    @JsonProperty("club_id")
    private String clubId;

    @JsonProperty("club_name")
    private String clubName;

    @JsonProperty("club_city")
    private String clubCity;

    @JsonProperty("logo_url")
    private String logoUrl;

    @JsonProperty("division_name")
    private String divisionName;
    private String format;
    private String gender;
    private String season;
}
