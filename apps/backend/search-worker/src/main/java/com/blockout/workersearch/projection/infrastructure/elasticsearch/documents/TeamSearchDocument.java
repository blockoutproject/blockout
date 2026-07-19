package com.blockout.workersearch.projection.infrastructure.elasticsearch.documents;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;

@Document(indexName = "teams")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamSearchDocument {
    @Id
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
    private String all;
}
