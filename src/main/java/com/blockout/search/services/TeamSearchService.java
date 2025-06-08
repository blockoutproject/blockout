package com.blockout.search.services;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import com.blockout.search.models.docs.TeamSearchDoc;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TeamSearchService {

    private final ElasticsearchClient elasticsearchClient;

    public List<TeamSearchDoc> searchByKeyword(String keyword) {
        try {
            Query query = Query.of(q -> q
                .bool(b -> b
                    .should(s -> s.match(mq -> mq
                        .field("keywordsAutocomplete")
                        .query(keyword)
                        .boost(2.0f)
                    ))
                    .should(s -> s.match(mq -> mq
                        .field("keywordsAutocompleteSimplified")
                        .query(keyword)
                        .boost(1.5f)
                    ))
                    .minimumShouldMatch("1")
                )
            );

            SearchResponse<TeamSearchDoc> response = elasticsearchClient.search(
                    s -> s.index("teams").query(query),
                    TeamSearchDoc.class
            );

            return response.hits().hits().stream()
                    .map(hit -> hit.source())
                    .toList();

        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}