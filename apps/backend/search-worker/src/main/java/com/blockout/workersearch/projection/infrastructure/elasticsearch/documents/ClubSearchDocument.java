package com.blockout.workersearch.projection.infrastructure.elasticsearch.documents;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;

@Document(indexName = "clubs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClubSearchDocument {
    @Id
    private String id;

    private String logoUrl;
    private String name;
    private String city;
    private String all;
}
