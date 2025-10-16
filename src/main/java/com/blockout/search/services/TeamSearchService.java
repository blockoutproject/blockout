package com.blockout.search.services;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.query_dsl.Operator;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch._types.query_dsl.TextQueryType;
import co.elastic.clients.elasticsearch.core.SearchResponse;

import com.blockout.search.models.docs.TeamSearchDoc;

import lombok.RequiredArgsConstructor;
import org.slf4j.*;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TeamSearchService {

    private static final Logger logger = LoggerFactory.getLogger(TeamSearchService.class);

    private final ElasticsearchClient elasticsearchClient;

    private static final int SIZE_EMPTY = 5;
    private static final int SIZE_QUERY = 20;
    private static final long TERMINATE_AFTER_EMPTY = 1_000L;
    private static final long TERMINATE_AFTER_QUERY = 5_000L;
    private static final String TIMEOUT = "150ms";

    public List<TeamSearchDoc> autocomplete(String input) {
        try {
            if (input == null || input.isBlank()) {
                SearchResponse<TeamSearchDoc> response = elasticsearchClient.search(
                        s -> s.index("teams")
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
                                                "shortName",
                                                "clubName",
                                                "clubCity",
                                                "divisionName",
                                                "season",
                                                "logoUrl"))),
                        TeamSearchDoc.class);
                return response.hits().hits().stream().map(h -> h.source()).toList();
            }

            Query q = Query.of(qq -> qq.multiMatch(mm -> mm
                    .query(input)
                    .type(TextQueryType.BoolPrefix)
                    .fields(
                            "shortName^4", "shortName._2gram^4", "shortName._3gram^4",
                            "name^3", "name._2gram^3", "name._3gram^3",
                            "clubName^2", "clubName._2gram^2", "clubName._3gram^2",
                            "clubCity^2", "clubCity._2gram^2", "clubCity._3gram^2",
                            "divisionName^2", "divisionName._2gram^2", "divisionName._3gram^2",
                            "season", "season._2gram", "season._3gram",
                            "all")
                    .operator(Operator.And)));

            SearchResponse<TeamSearchDoc> response = elasticsearchClient.search(
                    s -> s.index("teams")
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
                                            "clubName",
                                            "clubCity",
                                            "divisionName",
                                            "season",
                                            "logoUrl"))),
                    TeamSearchDoc.class);

            return response.hits().hits().stream().map(h -> h.source()).toList();

        } catch (Exception e) {
            logger.error("Error autocompleting teams: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}