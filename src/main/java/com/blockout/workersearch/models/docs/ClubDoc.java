package com.blockout.workersearch.models.docs;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;

@Document(indexName = "clubs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClubDoc {
    @Id
    private String id;
    private String name;
    private String city;
    
    // 🔍 Champs d'autocomplétion
    private String keywordsAutocomplete;
    private String keywordsAutocompleteSimplified;
}