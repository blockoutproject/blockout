package com.blockout.search.club.outbound;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Mutable Elasticsearch source document confined to the club store adapter. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
class ClubSearchDocument {
    private String id;
    private String name;
    private String logoUrl;
    private String city;
}
