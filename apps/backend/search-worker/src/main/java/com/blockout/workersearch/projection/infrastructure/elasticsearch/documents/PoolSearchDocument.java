package com.blockout.workersearch.projection.infrastructure.elasticsearch.documents;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;

@Document(indexName = "pools")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolSearchDocument {
    @Id
    private Long id;

    private String name;
    private String shortName;
    private Long divisionId;
    private String divisionName;
    private String leagueCode;
    private String leagueName;
    private String season;
    private String logoUrl;
    private String format;
    private String gender;
    private String all;
}
