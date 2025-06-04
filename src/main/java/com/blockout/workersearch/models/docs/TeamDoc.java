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
    private String clubId;
    private String clubName;
    private String clubCity;
    private String divisionName;
    private String format;
    private String gender;

    // 🔍 Champs d'autocomplétion
    private String keywordsAutocomplete;
    private String keywordsAutocompleteSimplified;
}