package com.blockout.search.search.infrastructure.elasticsearch;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.Operator;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch._types.query_dsl.TextQueryType;
import com.blockout.search.search.application.ports.SearchReader;
import com.blockout.search.search.application.queries.FilteredSearchQuery;
import com.blockout.search.search.application.views.ClubSearchResult;
import com.blockout.search.search.application.views.PoolSearchResult;
import com.blockout.search.search.application.views.TeamSearchResult;
import com.blockout.search.search.infrastructure.elasticsearch.documents.ClubSearchDocument;
import com.blockout.search.search.infrastructure.elasticsearch.documents.PoolSearchDocument;
import com.blockout.search.search.infrastructure.elasticsearch.documents.TeamSearchDocument;
import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ElasticsearchSearchReader implements SearchReader {

    private static final Logger LOGGER = LoggerFactory.getLogger(ElasticsearchSearchReader.class);
    private static final int EMPTY_QUERY_SIZE = 5;
    private static final int QUERY_SIZE = 20;
    private static final long EMPTY_QUERY_TERMINATE_AFTER = 1_000L;
    private static final long QUERY_TERMINATE_AFTER = 5_000L;
    private static final String TIMEOUT = "150ms";
    private static final List<String> CLUB_SOURCE_FIELDS = List.of("id", "name", "city", "logoUrl");
    private static final List<String> TEAM_SOURCE_FIELDS = List.of(
            "id", "name", "shortName", "clubId", "clubName", "clubCity", "logoUrl",
            "divisionId", "divisionName", "format", "gender", "season");
    private static final List<String> POOL_SOURCE_FIELDS = List.of(
            "id", "name", "shortName", "divisionId", "divisionName", "leagueCode", "leagueName",
            "season", "gender", "logoUrl", "format");

    private final ElasticsearchClient elasticsearchClient;

    @Override
    public List<ClubSearchResult> searchClubs(String text) {
        try {
            boolean emptyQuery = isBlank(text);
            Query query = emptyQuery ? randomQuery() : clubTextQuery(text);
            var response = elasticsearchClient.search(
                    search -> search.index("clubs")
                            .trackTotalHits(total -> total.enabled(false))
                            .size(size(emptyQuery))
                            .terminateAfter(terminateAfter(emptyQuery))
                            .timeout(TIMEOUT)
                            .query(query)
                            .source(source -> source.filter(filter -> filter.includes(CLUB_SOURCE_FIELDS))),
                    ClubSearchDocument.class);
            return response.hits().hits().stream()
                    .map(hit -> hit.source())
                    .filter(document -> document != null)
                    .map(document -> new ClubSearchResult(
                            document.id(), document.name(), document.logoUrl(), document.city()))
                    .toList();
        } catch (Exception exception) {
            LOGGER.error("Error searching clubs", exception);
            return Collections.emptyList();
        }
    }

    @Override
    public List<TeamSearchResult> searchTeams(FilteredSearchQuery searchQuery) {
        try {
            boolean emptyQuery = isBlank(searchQuery.text());
            Query query = applyFilters(
                    emptyQuery ? randomQuery() : teamTextQuery(searchQuery.text()), searchQuery);
            var response = elasticsearchClient.search(
                    search -> search.index("teams")
                            .trackTotalHits(total -> total.enabled(false))
                            .size(size(emptyQuery))
                            .terminateAfter(terminateAfter(emptyQuery))
                            .timeout(TIMEOUT)
                            .query(query)
                            .source(source -> source.filter(filter -> filter.includes(TEAM_SOURCE_FIELDS))),
                    TeamSearchDocument.class);
            return response.hits().hits().stream()
                    .map(hit -> hit.source())
                    .filter(document -> document != null)
                    .map(document -> new TeamSearchResult(
                            document.id(), document.name(), document.shortName(), document.clubId(),
                            document.clubName(), document.clubCity(), document.logoUrl(), document.divisionName(),
                            document.format(), document.gender(), document.season()))
                    .toList();
        } catch (Exception exception) {
            LOGGER.error("Error searching teams", exception);
            return Collections.emptyList();
        }
    }

    @Override
    public List<PoolSearchResult> searchPools(FilteredSearchQuery searchQuery) {
        try {
            boolean emptyQuery = isBlank(searchQuery.text());
            Query query = applyFilters(
                    emptyQuery ? randomQuery() : poolTextQuery(searchQuery.text()), searchQuery);
            var response = elasticsearchClient.search(
                    search -> search.index("pools")
                            .trackTotalHits(total -> total.enabled(false))
                            .size(size(emptyQuery))
                            .terminateAfter(terminateAfter(emptyQuery))
                            .timeout(TIMEOUT)
                            .query(query)
                            .source(source -> source.filter(filter -> filter.includes(POOL_SOURCE_FIELDS))),
                    PoolSearchDocument.class);
            return response.hits().hits().stream()
                    .map(hit -> hit.source())
                    .filter(document -> document != null)
                    .map(document -> new PoolSearchResult(
                            document.id(), document.name(), document.shortName(), document.divisionName(),
                            document.leagueCode(), document.leagueName(), document.season(), document.format(),
                            document.gender(), document.logoUrl()))
                    .toList();
        } catch (Exception exception) {
            LOGGER.error("Error searching pools", exception);
            return Collections.emptyList();
        }
    }

    private Query randomQuery() {
        return Query.of(query -> query.functionScore(score -> score
                .query(inner -> inner.matchAll(matchAll -> matchAll))
                .functions(function -> function.randomScore(random -> random))));
    }

    private Query clubTextQuery(String text) {
        return textQuery(text, List.of(
                "name^4", "name._2gram^4", "name._3gram^4",
                "city^2", "city._2gram^2", "city._3gram^2",
                "all"));
    }

    private Query teamTextQuery(String text) {
        return textQuery(text, List.of(
                "shortName^4", "shortName._2gram^4", "shortName._3gram^4",
                "name^3", "name._2gram^3", "name._3gram^3",
                "clubName^2", "clubName._2gram^2", "clubName._3gram^2",
                "clubCity^2", "clubCity._2gram^2", "clubCity._3gram^2",
                "divisionName^2", "divisionName._2gram^2", "divisionName._3gram^2",
                "all"));
    }

    private Query poolTextQuery(String text) {
        return textQuery(text, List.of(
                "shortName^4", "shortName._2gram^4", "shortName._3gram^4",
                "name^3", "name._2gram^3", "name._3gram^3",
                "divisionName^2", "divisionName._2gram^2", "divisionName._3gram^2",
                "leagueName^2", "leagueName._2gram^2", "leagueName._3gram^2",
                "all"));
    }

    private Query textQuery(String text, List<String> fields) {
        return Query.of(query -> query.multiMatch(multiMatch -> multiMatch
                .query(text)
                .type(TextQueryType.BoolPrefix)
                .fields(fields)
                .operator(Operator.And)));
    }

    private Query applyFilters(Query baseQuery, FilteredSearchQuery searchQuery) {
        BoolQuery.Builder filteredQuery = new BoolQuery.Builder().must(baseQuery);
        boolean filtered = false;

        if (!isBlank(searchQuery.season())) {
            filteredQuery.filter(term("season", searchQuery.season()));
            filtered = true;
        }
        if (searchQuery.divisionId() != null) {
            filteredQuery.filter(term("divisionId", searchQuery.divisionId()));
            filtered = true;
        }
        if (!isBlank(searchQuery.format())) {
            filteredQuery.filter(term("format", searchQuery.format()));
            filtered = true;
        }
        if (!isBlank(searchQuery.gender())) {
            filteredQuery.filter(term("gender", searchQuery.gender()));
            filtered = true;
        }

        return filtered ? Query.of(query -> query.bool(filteredQuery.build())) : baseQuery;
    }

    private Query term(String field, String value) {
        return Query.of(query -> query.term(term -> term.field(field).value(value)));
    }

    private Query term(String field, Long value) {
        return Query.of(query -> query.term(term -> term.field(field).value(value)));
    }

    private int size(boolean emptyQuery) {
        return emptyQuery ? EMPTY_QUERY_SIZE : QUERY_SIZE;
    }

    private long terminateAfter(boolean emptyQuery) {
        return emptyQuery ? EMPTY_QUERY_TERMINATE_AFTER : QUERY_TERMINATE_AFTER;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
