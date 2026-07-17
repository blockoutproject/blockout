package com.blockout.search.team.outbound;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Mutable Elasticsearch source document confined to the team store adapter. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
class TeamSearchDocument {
    private Long id;
    private String name;
    private String shortName;
    private String clubId;
    private String clubName;
    private String clubCity;
    private String logoUrl;
    private Long divisionId;
    private String divisionName;
    private String format;
    private String gender;
    private String season;
}
