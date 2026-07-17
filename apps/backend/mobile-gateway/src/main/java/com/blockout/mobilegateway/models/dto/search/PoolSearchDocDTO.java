package com.blockout.mobilegateway.models.dto.search;


import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PoolSearchDocDTO {
    private Long id;
    private String name;

    @JsonProperty("short_name")
    private String shortName;

    @JsonProperty("division_name")
    private String divisionName;

    @JsonProperty("league_code")
    private String leagueCode;

    @JsonProperty("league_name")
    private String leagueName;
    private String season;
    private String format;
    private String gender;

    @JsonProperty("logo_url")
    private String logoUrl;
}
