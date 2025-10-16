package com.blockout.search.services;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.query_dsl.Operator;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch._types.query_dsl.TextQueryType;
import co.elastic.clients.elasticsearch.core.SearchResponse;

import com.blockout.search.models.docs.ClubSearchDoc;

import lombok.RequiredArgsConstructor;
import org.slf4j.*;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ClubSearchService {

    private static final Logger logger = LoggerFactory.getLogger(ClubSearchService.class);

    private final ElasticsearchClient elasticsearchClient;

    private static final int SIZE_EMPTY = 5;
    private static final int SIZE_QUERY = 20;
    private static final long TERMINATE_AFTER_EMPTY = 1_000L;
    private static final long TERMINATE_AFTER_QUERY = 5_000L;
    private static final String TIMEOUT = "150ms";

    public List<ClubSearchDoc> autocomplete(String input) {
        try {
            if (input == null || input.isBlank()) {
                SearchResponse<ClubSearchDoc> response = elasticsearchClient.search(
                        s -> s.index("clubs")
                                .trackTotalHits(t -> t.enabled(false))
                                .size(SIZE_EMPTY)
                                .terminateAfter(TERMINATE_AFTER_EMPTY)
                                .timeout(TIMEOUT)
                                .query(q -> q.functionScore(fs -> fs
                                        .query(inner -> inner.matchAll(m -> m))
                                        .functions(f -> f.randomScore(rs -> rs))))
                                .source(src -> src.filter(f -> f
                                        .includes(
                                                "id",
                                                "name",
                                                "city",
                                                "logoUrl"))),
                        ClubSearchDoc.class);
                return response.hits().hits().stream().map(h -> h.source()).toList();
            }

            Query q = Query.of(qq -> qq.multiMatch(mm -> mm
                    .query(input)
                    .type(TextQueryType.BoolPrefix)
                    .fields(
                            "name^4", "name._2gram^4", "name._3gram^4",
                            "city^2", "city._2gram^2", "city._3gram^2",
                            "all")
                    .operator(Operator.And)));

            SearchResponse<ClubSearchDoc> response = elasticsearchClient.search(
                    s -> s.index("clubs")
                            .trackTotalHits(t -> t.enabled(false))
                            .size(SIZE_QUERY)
                            .terminateAfter(TERMINATE_AFTER_QUERY)
                            .timeout(TIMEOUT)
                            .query(q)
                            .source(src -> src.filter(f -> f
                                    .includes(
                                            "id",
                                            "name",
                                            "city",
                                            "logoUrl"))),
                    ClubSearchDoc.class);

            return response.hits().hits().stream().map(h -> h.source()).toList();
        } catch (Exception e) {
            logger.error("Error autocompleting clubs: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}