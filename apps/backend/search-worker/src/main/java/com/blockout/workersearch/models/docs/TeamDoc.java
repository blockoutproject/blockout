package com.blockout.workersearch.models.docs;

import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.annotation.Id;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(indexName = "teams")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamDoc {
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