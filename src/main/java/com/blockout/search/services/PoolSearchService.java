package com.blockout.search.services;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.query_dsl.Operator;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch._types.query_dsl.TextQueryType;
import co.elastic.clients.elasticsearch.core.SearchResponse;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.blockout.search.models.docs.PoolSearchDoc;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PoolSearchService {

    private static final Logger logger = LoggerFactory.getLogger(PoolSearchService.class);

    private final ElasticsearchClient elasticsearchClient;

    // Petites constantes pour éviter la "magie" dans le code
    private static final int SIZE_EMPTY = 5;
    private static final int SIZE_QUERY = 20;
    private static final long TERMINATE_AFTER_EMPTY = 1_000L; // <-- L suffix
    private static final long TERMINATE_AFTER_QUERY = 5_000L; // <-- L suffix
    private static final String TIMEOUT = "150ms";

    /** Autocomplete H24 */
    public List<PoolSearchDoc> autocomplete(String input) {
        try {
            if (input == null || input.isBlank()) {
                SearchResponse<PoolSearchDoc> response = elasticsearchClient.search(
                        s -> s.index("pools")
                                .trackTotalHits(t -> t.enabled(false))
                                .size(SIZE_EMPTY)
                                .terminateAfter(TERMINATE_AFTER_EMPTY)
                                .timeout(TIMEOUT)
                                .query(q -> q.functionScore(fs -> fs
                                        .query(inner -> inner.matchAll(m -> m))
                                        .functions(f -> f.randomScore(rs -> rs))))
                                .source(src -> src.filter(f -> f
                                        .includes("id", "name", "shortName", "divisionName", "leagueName", "season",
                                                "logoUrl"))),
                        PoolSearchDoc.class);
                return response.hits().hits().stream().map(h -> h.source()).toList();
            }

            // Autocomplete: bool_prefix sur search_as_you_type
            Query q = Query.of(qq -> qq.multiMatch(mm -> mm
                    .query(input)
                    .type(TextQueryType.BoolPrefix)
                    .fields(
                            "shortName^4", "shortName._2gram^4", "shortName._3gram^4",
                            "name^3", "name._2gram^3", "name._3gram^3",
                            "divisionName^2", "divisionName._2gram^2", "divisionName._3gram^2",
                            "leagueName^2", "leagueName._2gram^2", "leagueName._3gram^2",
                            "season", "season._2gram", "season._3gram",
                            "all")
                    .operator(Operator.And)));

            SearchResponse<PoolSearchDoc> response = elasticsearchClient.search(
                    s -> s.index("pools")
                            .trackTotalHits(t -> t.enabled(false))
                            .size(SIZE_QUERY)
                            .terminateAfter(TERMINATE_AFTER_QUERY)
                            .timeout(TIMEOUT)
                            .query(q)
                            .source(src -> src.filter(f -> f
                                    .includes(
                                            "id",
                                            "name",
                                            "shortName",
                                            "divisionName",
                                            "leagueName",
                                            "season",
                                            "logoUrl"))),
                    PoolSearchDoc.class);

            return response.hits().hits().stream().map(h -> h.source()).toList();

        } catch (Exception e) {
            logger.error("Error autocompleting pools: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}