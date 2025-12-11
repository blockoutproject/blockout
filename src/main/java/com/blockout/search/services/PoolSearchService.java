package com.blockout.search.services;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.Operator;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch._types.query_dsl.TextQueryType;
import co.elastic.clients.elasticsearch.core.SearchResponse;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.blockout.search.models.dto.PoolSearchDocDTO;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PoolSearchService {

    private static final Logger logger = LoggerFactory.getLogger(PoolSearchService.class);

    private final ElasticsearchClient elasticsearchClient;

    private static final int SIZE_EMPTY = 5;
    private static final int SIZE_QUERY = 20;
    private static final long TERMINATE_AFTER_EMPTY = 1_000L;
    private static final long TERMINATE_AFTER_QUERY = 5_000L;
    private static final String TIMEOUT = "150ms";

    /**
     * @param input texte tapé par l'utilisateur
     * @param season saison filtrée (keyword, ex: "2025/2026")
     * @param divisionId division filtrée (id numérique)
     * @param format format filtré (ex: "SIX", "FOUR", "TWO")
     */
    public List<PoolSearchDocDTO> autocomplete(String input, String season, Long divisionId, String format) {
        try {
            if (input == null || input.isBlank()) {
                Query base = Query.of(q -> q.functionScore(fs -> fs
                        .query(inner -> inner.matchAll(m -> m))
                        .functions(f -> f.randomScore(rs -> rs))));

                Query finalQuery = applyFilters(base, season, divisionId, format);

                SearchResponse<PoolSearchDocDTO> response = elasticsearchClient.search(
                        s -> s.index("pools")
                                .trackTotalHits(t -> t.enabled(false))
                                .size(SIZE_EMPTY)
                                .terminateAfter(TERMINATE_AFTER_EMPTY)
                                .timeout(TIMEOUT)
                                .query(finalQuery)
                                .source(src -> src.filter(f -> f.includes(
                                        "id", "name", "shortName",
                                        "divisionId", "divisionName",
                                        "leagueCode", "leagueName",
                                        "season", "gender", "logoUrl",
                                        "format"))),
                        PoolSearchDocDTO.class);

                return response.hits().hits().stream()
                        .map(h -> h.source())
                        .toList();
            }

            Query multiMatchQuery = Query.of(qq -> qq.multiMatch(mm -> mm
                    .query(input)
                    .type(TextQueryType.BoolPrefix)
                    .fields(
                            "shortName^4", "shortName._2gram^4", "shortName._3gram^4",
                            "name^3", "name._2gram^3", "name._3gram^3",
                            "divisionName^2", "divisionName._2gram^2", "divisionName._3gram^2",
                            "leagueName^2", "leagueName._2gram^2", "leagueName._3gram^2",
                            "all")
                    .operator(Operator.And)));

            Query finalQuery = applyFilters(multiMatchQuery, season, divisionId, format);

            SearchResponse<PoolSearchDocDTO> response = elasticsearchClient.search(
                    s -> s.index("pools")
                            .trackTotalHits(t -> t.enabled(false))
                            .size(SIZE_QUERY)
                            .terminateAfter(TERMINATE_AFTER_QUERY)
                            .timeout(TIMEOUT)
                            .query(finalQuery)
                            .source(src -> src.filter(f -> f.includes(
                                    "id", "name", "shortName",
                                    "divisionId", "divisionName",
                                    "leagueCode", "leagueName",
                                    "season", "gender", "logoUrl",
                                    "format"))),
                    PoolSearchDocDTO.class);

            return response.hits().hits().stream()
                    .map(h -> h.source())
                    .toList();

        } catch (Exception e) {
            logger.error("Error autocompleting pools: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private Query applyFilters(Query baseQuery, String season, Long divisionId, String format) {
        if ((season == null || season.isBlank())
                && divisionId == null
                && (format == null || format.isBlank())) {
            return baseQuery;
        }

        BoolQuery.Builder bool = new BoolQuery.Builder().must(baseQuery);

        if (season != null && !season.isBlank()) {
            Query seasonFilter = Query.of(q -> q.term(t -> t
                    .field("season")
                    .value(season)));
            bool.filter(seasonFilter);
        }

        if (divisionId != null) {
            Query divisionFilter = Query.of(q -> q.term(t -> t
                    .field("divisionId")
                    .value(divisionId)));
            bool.filter(divisionFilter);
        }

        if (format != null && !format.isBlank()) {
            Query formatFilter = Query.of(q -> q.term(t -> t
                    .field("format")
                    .value(format)));
            bool.filter(formatFilter);
        }

        return Query.of(q -> q.bool(bool.build()));
    }
}