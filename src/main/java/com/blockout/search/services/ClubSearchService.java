package com.blockout.search.services;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch._types.query_dsl.Operator;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;

import com.blockout.search.models.docs.ClubSearchDoc;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ClubSearchService {

    private final ElasticsearchClient elasticsearchClient;
    private static final Logger logger = LoggerFactory.getLogger(ClubSearchService.class);

    public List<ClubSearchDoc> searchByKeyword(String keyword) {
        try {
            if (keyword == null || keyword.isBlank()) {
                SearchResponse<ClubSearchDoc> response = elasticsearchClient.search(
                        s -> s.index("clubs")
                                .size(5)
                                .query(q -> q.functionScore(fs -> fs
                                        .query(inner -> inner.matchAll(m -> m))
                                        .functions(f -> f.randomScore(rs -> rs)))),
                        ClubSearchDoc.class);

                return response.hits().hits().stream()
                        .map(hit -> hit.source())
                        .toList();
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

            SearchResponse<ClubSearchDoc> response = elasticsearchClient.search(
                    s -> s.index("clubs").query(query).size(20),
                    ClubSearchDoc.class);

            return response.hits().hits().stream()
                    .map(hit -> hit.source())
                    .toList();

        } catch (Exception e) {
            logger.error("Error searching clubs by keyword: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}