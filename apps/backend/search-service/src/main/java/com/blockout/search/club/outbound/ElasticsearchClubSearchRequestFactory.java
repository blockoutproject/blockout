package com.blockout.search.club.outbound;

import co.elastic.clients.elasticsearch.core.SearchRequest;
import com.blockout.search.shared.application.SearchQuery;
import com.blockout.search.shared.outbound.ElasticsearchSearchQueryFactory;
import java.util.List;
import org.springframework.stereotype.Component;

/** Owns the club index request while leaving execution to the store adapter. */
@Component
class ElasticsearchClubSearchRequestFactory {

    private static final String TIMEOUT = "150ms";
    private static final List<String> TEXT_FIELDS = List.of(
            "name^4", "name._2gram^4", "name._3gram^4",
            "city^2", "city._2gram^2", "city._3gram^2",
            "all");
    private static final List<String> SOURCE_FIELDS = List.of("id", "name", "city", "logoUrl");

    SearchRequest create(SearchQuery query) {
        var selection = ElasticsearchSearchQueryFactory.create(query, TEXT_FIELDS);
        return SearchRequest.of(search -> search.index("clubs")
                .trackTotalHits(total -> total.enabled(false))
                .size(selection.size())
                .terminateAfter(selection.terminateAfter())
                .timeout(TIMEOUT)
                .query(selection.query())
                .source(source -> source.filter(filter -> filter.includes(SOURCE_FIELDS))));
    }
}
