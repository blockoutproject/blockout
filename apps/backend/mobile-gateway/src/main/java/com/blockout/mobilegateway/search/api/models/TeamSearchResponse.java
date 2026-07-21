package com.blockout.mobilegateway.search.api.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamSearchResponse {
    private Long id;
    private String name;
    private String shortName;
    private String clubId;
    private String clubName;
    private String clubCity;
    private String logoUrl;
    private String divisionName;
    private String format;
    private String gender;
    private String season;
}
