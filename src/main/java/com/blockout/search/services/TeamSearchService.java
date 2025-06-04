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

            // Tokenisation simple des mots-clés
            String[] tokens = keyword.toLowerCase().split("\\s+");

            Query boolQuery = Query.of(q -> q
                    .bool(b -> {
                        for (String token : tokens) {
                            b.should(s -> s.match(m -> m.field("nameSimplified").query(token).boost(5.0f)));
                            b.should(s -> s.match(m -> m.field("clubNameSimplified").query(token).boost(4.0f)));
                            b.should(s -> s.match(m -> m.field("clubCitySimplified").query(token).boost(3.0f)));
                            b.should(s -> s.match(m -> m.field("divisionNameSimplified").query(token).boost(2.0f)));
                            b.should(s -> s.match(m -> m.field("keywords").query(token).boost(1.0f)));
                        }
                        b.minimumShouldMatch(String.valueOf(tokens.length)); // tous les tokens doivent matcher
                        return b;
                    }));

            SearchResponse<TeamSearchDoc> response = elasticsearchClient.search(
                    s -> s.index("teams").query(boolQuery),
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