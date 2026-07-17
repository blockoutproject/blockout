package com.blockout.search.pool.outbound;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Mutable Elasticsearch source document confined to the pool store adapter. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
class PoolSearchDocument {
    private Long id;
    private String name;
    private String shortName;
    private Long divisionId;
    private String divisionName;
    private String leagueCode;
    private String leagueName;
    private String season;
    private String format;
    private String gender;
    private String logoUrl;
}
