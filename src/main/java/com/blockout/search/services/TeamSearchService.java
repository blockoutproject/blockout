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
            SearchResponse<TeamSearchDoc> response = elasticsearchClient.search(
                    s -> s
                            .index("teams")
                            .query(q -> q
                                    .multiMatch(m -> m
                                            .query(keyword)
                                            .fields("name^3", "clubCity^2", "clubName^2", "divisionName")
                                            .fuzziness("AUTO")
                                            .minimumShouldMatch("70%")
                                            .prefixLength(2)
                                            .type(TextQueryType.BestFields))),
                    TeamSearchDoc.class);

            return response.hits().hits().stream()
                    .map(hit -> hit.source())
                    .toList();

        } catch (Exception e) {
            logger.error("Error during keyword search", e);
            return List.of();
        }
    }
}