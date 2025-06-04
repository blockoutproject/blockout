package com.blockout.search.services;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.query_dsl.*;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import com.blockout.search.models.docs.TeamSearchDoc;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TeamSearchService {

    private static final Logger logger = LoggerFactory.getLogger(TeamSearchService.class);
    private final ElasticsearchClient elasticsearchClient;

    public List<TeamSearchDoc> searchByKeyword(String keyword) {
        try {
            logger.info("Searching for teams with keyword: {}", keyword);

            Query multiMatchQuery = Query.of(q -> q
                .multiMatch(m -> m
                    .query(keyword)
                    .fields("name^5", "clubName^4", "clubCity^3", "divisionName")
                    .fuzziness("AUTO")
                    .minimumShouldMatch("50%")
                    .prefixLength(1)
                    .type(TextQueryType.BestFields)
                )
            );

            Query namePrefixQuery = Query.of(q -> q
                .prefix(p -> p
                    .field("name")
                    .value(keyword.toLowerCase())
                )
            );

            Query clubNamePrefixQuery = Query.of(q -> q
                .prefix(p -> p
                    .field("clubName")
                    .value(keyword.toLowerCase())
                )
            );

            Query combinedQuery = Query.of(q -> q
                .bool(b -> b
                    .should(multiMatchQuery)
                    .should(namePrefixQuery)
                    .should(clubNamePrefixQuery)
                    .minimumShouldMatch("1")
                )
            );

            SearchResponse<TeamSearchDoc> response = elasticsearchClient.search(
                s -> s
                    .index("teams")
                    .query(combinedQuery),
                TeamSearchDoc.class
            );

            return response.hits().hits().stream()
                .map(hit -> hit.source())
                .toList();

        } catch (Exception e) {
            logger.error("Error during keyword search", e);
            return List.of();
        }
    }
}