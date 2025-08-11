package com.blockout.search.services;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch._types.query_dsl.Operator;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch._types.query_dsl.TextQueryType; // ← ici

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import com.blockout.search.models.docs.PoolSearchDoc;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PoolSearchService {

    private final ElasticsearchClient elasticsearchClient;

    public List<PoolSearchDoc> searchByKeyword(String keyword) {
        try {
            Query query = Query.of(q -> q.multiMatch(mm -> mm
                .query(keyword)
                .fields("keywordsAutocomplete^2,keywordsAutocompleteSimplified^3")
                .type(TextQueryType.BoolPrefix)
                .operator(Operator.And)
                .fuzziness("AUTO")
            ));

            SearchResponse<PoolSearchDoc> response = elasticsearchClient.search(
                s -> s.index("pools").query(query).size(20),
                PoolSearchDoc.class
            );

            return response.hits().hits().stream()
                .map(hit -> hit.source())
                .toList();

        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}