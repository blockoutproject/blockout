package com.blockout.search.services;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch._types.SortOrder;
import co.elastic.clients.elasticsearch._types.query_dsl.Operator;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch._types.query_dsl.TextQueryType;
import com.blockout.search.models.docs.TeamSearchDoc;
import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class TeamSearchService {

    private final ElasticsearchClient elasticsearchClient;
    private static final Logger logger = LoggerFactory.getLogger(TeamSearchService.class);

    public List<TeamSearchDoc> searchByKeyword(String keyword) {
        try {
            if (keyword == null || keyword.isBlank()) {
                return Collections.emptyList();
            }

            Query query = Query.of(q -> q.multiMatch(mm -> mm
                    .query(keyword.trim())
                    .fields("keywordsAutocomplete^2", "keywordsAutocompleteSimplified^3")
                    .type(TextQueryType.BoolPrefix)
                    .operator(Operator.And)
                    .fuzziness("AUTO")
                    .prefixLength(1)
                    .maxExpansions(50)));

            SearchResponse<TeamSearchDoc> response = elasticsearchClient.search(
                    s -> s.index("teams")
                            .query(query)
                            .size(20)
                            .sort(ss -> ss.score(sc -> sc.order(SortOrder.Desc))),
                    TeamSearchDoc.class);

            return response.hits().hits().stream()
                    .map(h -> h.source())
                    .filter(Objects::nonNull)
                    .toList();

        } catch (Exception e) {
            logger.error("Error searching teams by keyword: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}