package com.blockout.search.club.outbound;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.query_dsl.Operator;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch._types.query_dsl.TextQueryType;
import co.elastic.clients.elasticsearch.core.SearchRequest;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import com.blockout.search.club.application.ClubSearchResult;
import com.blockout.search.club.application.ClubSearchStore;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Owns the current club Elasticsearch query and source projection. */
@Component
@RequiredArgsConstructor
public class ElasticsearchClubSearchStore implements ClubSearchStore {

    private static final int SIZE_EMPTY = 5;
    private static final int SIZE_QUERY = 20;
    private static final long TERMINATE_AFTER_EMPTY = 1_000L;
    private static final long TERMINATE_AFTER_QUERY = 5_000L;
    private static final String TIMEOUT = "150ms";

    private final ElasticsearchClient client;
    private final ClubSearchDocumentMapper mapper;

    @Override
    public List<ClubSearchResult> search(String query) throws Exception {
        SearchResponse<ClubSearchDocument> response = client.search(request(query), ClubSearchDocument.class);
        return response.hits().hits().stream().map(hit -> mapper.toResult(hit.source())).toList();
    }

    SearchRequest request(String query) {
        if (query == null || query.isBlank()) {
            return SearchRequest.of(
                    search -> search.index("clubs")
                            .trackTotalHits(total -> total.enabled(false))
                            .size(SIZE_EMPTY)
                            .terminateAfter(TERMINATE_AFTER_EMPTY)
                            .timeout(TIMEOUT)
                            .query(value -> value.functionScore(score -> score
                                    .query(inner -> inner.matchAll(match -> match))
                                    .functions(function -> function.randomScore(random -> random))))
                            .source(source -> source.filter(filter -> filter
                                    .includes("id", "name", "city", "logoUrl"))));
        }

        Query textQuery = Query.of(value -> value.multiMatch(match -> match
                .query(query)
                .type(TextQueryType.BoolPrefix)
                .fields(
                        "name^4", "name._2gram^4", "name._3gram^4",
                        "city^2", "city._2gram^2", "city._3gram^2",
                        "all")
                .operator(Operator.And)));
        return SearchRequest.of(
                search -> search.index("clubs")
                        .trackTotalHits(total -> total.enabled(false))
                        .size(SIZE_QUERY)
                        .terminateAfter(TERMINATE_AFTER_QUERY)
                        .timeout(TIMEOUT)
                        .query(textQuery)
                        .source(source -> source.filter(filter -> filter
                                .includes("id", "name", "city", "logoUrl"))));
    }
}
