package com.blockout.search.team.outbound;

import co.elastic.clients.elasticsearch.core.SearchRequest;
import com.blockout.search.shared.application.FilteredSearchQuery;
import com.blockout.search.shared.outbound.ElasticsearchSearchQueryFactory;
import java.util.List;
import org.springframework.stereotype.Component;

/** Owns the team index request, exact filters, and retained source projection. */
@Component
class ElasticsearchTeamSearchRequestFactory {

    private static final String TIMEOUT = "150ms";
    private static final List<String> TEXT_FIELDS = List.of(
            "shortName^4", "shortName._2gram^4", "shortName._3gram^4",
            "name^3", "name._2gram^3", "name._3gram^3",
            "clubName^2", "clubName._2gram^2", "clubName._3gram^2",
            "clubCity^2", "clubCity._2gram^2", "clubCity._3gram^2",
            "divisionName^2", "divisionName._2gram^2", "divisionName._3gram^2",
            "all");
    private static final List<String> SOURCE_FIELDS = List.of(
            "id", "name", "shortName", "clubId", "clubName", "clubCity", "logoUrl",
            "divisionId", "divisionName", "format", "gender", "season");

    SearchRequest create(FilteredSearchQuery query) {
        var selection = ElasticsearchSearchQueryFactory.create(query.query(), TEXT_FIELDS);
        var filtered = ElasticsearchSearchQueryFactory.applyExactFilters(selection.query(), query.filters());
        return SearchRequest.of(search -> search.index("teams")
                .trackTotalHits(total -> total.enabled(false))
                .size(selection.size())
                .terminateAfter(selection.terminateAfter())
                .timeout(TIMEOUT)
                .query(filtered)
                .source(source -> source.filter(filter -> filter.includes(SOURCE_FIELDS))));
    }
}
