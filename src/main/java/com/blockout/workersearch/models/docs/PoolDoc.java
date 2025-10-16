package com.blockout.workersearch.models.docs;

import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(indexName = "pools")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolDoc {
    @Id
    private Long id;
    private String name;
    private String shortName;
    private String divisionName;
    private String leagueName;
    private String season;
    private String logoUrl;

    private String keywordsAutocomplete;
    private String keywordsAutocompleteSimplified;
}