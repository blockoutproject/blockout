package com.blockout.mobilegateway.search.api.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolSearchResponse {
    private Long id;
    private String name;
    private String shortName;
    private String divisionName;
    private String leagueCode;
    private String leagueName;
    private String season;
    private String format;
    private String gender;
    private String logoUrl;
}
