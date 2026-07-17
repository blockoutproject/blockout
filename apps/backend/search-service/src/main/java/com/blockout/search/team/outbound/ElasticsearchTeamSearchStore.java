package com.blockout.search.team.outbound;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.Operator;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch._types.query_dsl.TextQueryType;
import co.elastic.clients.elasticsearch.core.SearchRequest;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import com.blockout.search.shared.application.SearchFilters;
import com.blockout.search.team.application.TeamSearchResult;
import com.blockout.search.team.application.TeamSearchStore;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Owns the current team Elasticsearch query, exact filters, and source projection. */
@Component
@RequiredArgsConstructor
public class ElasticsearchTeamSearchStore implements TeamSearchStore {

    private static final int SIZE_EMPTY = 5;
    private static final int SIZE_QUERY = 20;
    private static final long TERMINATE_AFTER_EMPTY = 1_000L;
    private static final long TERMINATE_AFTER_QUERY = 5_000L;
    private static final String TIMEOUT = "150ms";
    private static final List<String> SOURCE_FIELDS = List.of(
            "id", "name", "shortName", "clubId", "clubName", "clubCity", "logoUrl",
            "divisionId", "divisionName", "format", "gender", "season");

    private final ElasticsearchClient client;
    private final TeamSearchDocumentMapper mapper;

    @Override
    public List<TeamSearchResult> search(SearchFilters filters) throws Exception {
        SearchResponse<TeamSearchDocument> response = client.search(request(filters), TeamSearchDocument.class);
        return response.hits().hits().stream().map(hit -> mapper.toResult(hit.source())).toList();
    }

    SearchRequest request(SearchFilters filters) {
        Query base;
        int size;
        long terminateAfter;
        if (filters.query() == null || filters.query().isBlank()) {
            base = Query.of(query -> query.functionScore(score -> score
                    .query(inner -> inner.matchAll(match -> match))
                    .functions(function -> function.randomScore(random -> random))));
            size = SIZE_EMPTY;
            terminateAfter = TERMINATE_AFTER_EMPTY;
        } else {
            base = Query.of(query -> query.multiMatch(match -> match
                    .query(filters.query())
                    .type(TextQueryType.BoolPrefix)
                    .fields(
                            "shortName^4", "shortName._2gram^4", "shortName._3gram^4",
                            "name^3", "name._2gram^3", "name._3gram^3",
                            "clubName^2", "clubName._2gram^2", "clubName._3gram^2",
                            "clubCity^2", "clubCity._2gram^2", "clubCity._3gram^2",
                            "divisionName^2", "divisionName._2gram^2", "divisionName._3gram^2",
                            "all")
                    .operator(Operator.And)));
            size = SIZE_QUERY;
            terminateAfter = TERMINATE_AFTER_QUERY;
        }

        Query finalQuery = applyFilters(base, filters);
        return SearchRequest.of(
                search -> search.index("teams")
                        .trackTotalHits(total -> total.enabled(false))
                        .size(size)
                        .terminateAfter(terminateAfter)
                        .timeout(TIMEOUT)
                        .query(finalQuery)
                        .source(source -> source.filter(filter -> filter.includes(SOURCE_FIELDS))));
    }

    private Query applyFilters(Query base, SearchFilters filters) {
        if (blank(filters.season())
                && filters.divisionId() == null
                && blank(filters.format())
                && blank(filters.gender())) {
            return base;
        }
        BoolQuery.Builder filtered = new BoolQuery.Builder().must(base);
        if (!blank(filters.season())) {
            filtered.filter(Query.of(query -> query.term(term -> term
                    .field("season").value(filters.season()))));
        }
        if (filters.divisionId() != null) {
            filtered.filter(Query.of(query -> query.term(term -> term
                    .field("divisionId").value(filters.divisionId()))));
        }
        if (!blank(filters.format())) {
            filtered.filter(Query.of(query -> query.term(term -> term
                    .field("format").value(filters.format()))));
        }
        if (!blank(filters.gender())) {
            filtered.filter(Query.of(query -> query.term(term -> term
                    .field("gender").value(filters.gender()))));
        }
        return Query.of(query -> query.bool(filtered.build()));
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
