package com.blockout.search.shared.outbound;

import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.Operator;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch._types.query_dsl.TextQueryType;
import com.blockout.search.shared.application.SearchFilters;
import com.blockout.search.shared.application.SearchQuery;
import java.util.List;

/** Builds the retained Elasticsearch text, random, and exact-filter query shapes. */
public final class ElasticsearchSearchQueryFactory {

    private static final int SIZE_EMPTY = 5;
    private static final int SIZE_QUERY = 20;
    private static final long TERMINATE_AFTER_EMPTY = 1_000L;
    private static final long TERMINATE_AFTER_QUERY = 5_000L;

    private ElasticsearchSearchQueryFactory() {
    }

    public static ElasticsearchSearchQuery create(SearchQuery query, List<String> textFields) {
        if (query.isBlank()) {
            return new ElasticsearchSearchQuery(
                    Query.of(value -> value.functionScore(score -> score
                            .query(inner -> inner.matchAll(match -> match))
                            .functions(function -> function.randomScore(random -> random)))),
                    SIZE_EMPTY,
                    TERMINATE_AFTER_EMPTY);
        }
        return new ElasticsearchSearchQuery(
                Query.of(value -> value.multiMatch(match -> match
                        .query(query.text())
                        .type(TextQueryType.BoolPrefix)
                        .fields(textFields)
                        .operator(Operator.And))),
                SIZE_QUERY,
                TERMINATE_AFTER_QUERY);
    }

    public static Query applyExactFilters(Query base, SearchFilters filters) {
        if (blank(filters.season())
                && filters.divisionId() == null
                && blank(filters.format())
                && blank(filters.gender())) {
            return base;
        }
        BoolQuery.Builder filtered = new BoolQuery.Builder().must(base);
        if (!blank(filters.season())) {
            filtered.filter(term("season", filters.season()));
        }
        if (filters.divisionId() != null) {
            filtered.filter(term("divisionId", filters.divisionId()));
        }
        if (!blank(filters.format())) {
            filtered.filter(term("format", filters.format()));
        }
        if (!blank(filters.gender())) {
            filtered.filter(term("gender", filters.gender()));
        }
        return Query.of(query -> query.bool(filtered.build()));
    }

    private static Query term(String field, String value) {
        return Query.of(query -> query.term(term -> term.field(field).value(value)));
    }

    private static Query term(String field, long value) {
        return Query.of(query -> query.term(term -> term.field(field).value(value)));
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    public record ElasticsearchSearchQuery(
            Query query,
            int size,
            long terminateAfter) {
    }
}
