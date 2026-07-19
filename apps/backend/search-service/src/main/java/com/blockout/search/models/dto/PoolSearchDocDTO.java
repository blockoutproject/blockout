package com.blockout.search.models.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

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
    private String shortName;
    private String divisionName;
    private String leagueCode;
    private String leagueName;
    private String season;
    private String format;
    private String gender;
    private String logoUrl;
}