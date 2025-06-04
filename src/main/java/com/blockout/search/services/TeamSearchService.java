package com.blockout.search.services;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
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
            logger.info("🔍 Searching for teams with keyword: {}", keyword);

            // On booste le champ simplifié si besoin
            Query query = Query.of(q -> q
                .bool(b -> b
                    .should(s -> s.match(mq -> mq
                        .field("keywordsAutocomplete")
                        .query(keyword)
                        .boost(2.0f)
                    ))
                    .should(s -> s.match(mq -> mq
                        .field("keywordsAutocompleteSimplified")
                        .query(keyword)
                        .boost(1.5f)
                    ))
                    .minimumShouldMatch("1")
                )
            );

            SearchResponse<TeamSearchDoc> response = elasticsearchClient.search(
                    s -> s.index("teams").query(query),
                    TeamSearchDoc.class
            );

            return response.hits().hits().stream()
                    .map(hit -> hit.source())
                    .toList();

        } catch (Exception e) {
            logger.error("❌ Error during keyword search", e);
            return List.of();
        }
    }
}