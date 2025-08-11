package com.blockout.search.services;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch._types.query_dsl.Operator;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import com.blockout.search.models.docs.PoolSearchDoc;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PoolSearchService {

    private final ElasticsearchClient elasticsearchClient;

    public List<PoolSearchDoc> searchByKeyword(String keyword) {
        try {
            if (keyword == null || keyword.isBlank()) {
                return Collections.emptyList();
            }

            String wildcardQuery = Arrays.stream(keyword.trim().split("\\s+"))
                    .filter(t -> !t.isBlank())
                    .map(t -> t + "*")
                    .collect(Collectors.joining(" "));

            Query query = Query.of(q -> q.simpleQueryString(sqs -> sqs
                    .query(wildcardQuery)
                    .fields("keywordsAutocomplete^2", "keywordsAutocompleteSimplified^3")
                    .defaultOperator(Operator.And)
                    .lenient(true)));

            SearchResponse<PoolSearchDoc> response = elasticsearchClient.search(
                    s -> s.index("pools").query(query).size(20),
                    PoolSearchDoc.class);

            return response.hits().hits().stream()
                    .map(hit -> hit.source())
                    .toList();

        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}