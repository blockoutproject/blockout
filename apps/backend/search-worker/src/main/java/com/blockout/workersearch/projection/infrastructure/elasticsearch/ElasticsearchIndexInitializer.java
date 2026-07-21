package com.blockout.workersearch.projection.infrastructure.elasticsearch;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.indices.CreateIndexRequest;
import co.elastic.clients.elasticsearch.indices.DeleteIndexRequest;
import co.elastic.clients.elasticsearch.indices.ExistsRequest;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class ElasticsearchIndexInitializer {

    private static final Logger LOGGER = LoggerFactory.getLogger(ElasticsearchIndexInitializer.class);

    private final ElasticsearchClient elasticsearchClient;

    @PostConstruct
    @SneakyThrows
    public void initializeTeamIndex() {
        recreate("teams", "elasticsearch/teams-index.json");
    }

    @PostConstruct
    @SneakyThrows
    public void initializeClubIndex() {
        recreate("clubs", "elasticsearch/clubs-index.json");
    }

    @PostConstruct
    @SneakyThrows
    public void initializePoolIndex() {
        recreate("pools", "elasticsearch/pools-index.json");
    }

    private void recreate(String indexName, String jsonPath) throws java.io.IOException {
        var exists = elasticsearchClient.indices().exists(ExistsRequest.of(request -> request.index(indexName)));
        if (exists.value()) {
            LOGGER.info(
                "Deleting existing search index",
                keyValue("action", "delete_search_index"),
                keyValue("index", indexName));
            elasticsearchClient.indices().delete(DeleteIndexRequest.of(request -> request.index(indexName)));
        }

        LOGGER.info(
            "Creating search index from JSON config",
            keyValue("action", "create_search_index"),
            keyValue("index", indexName),
            keyValue("source", jsonPath));

        try (InputStream jsonStream = new ClassPathResource(jsonPath).getInputStream()) {
            var request = CreateIndexRequest.of(builder -> builder.index(indexName).withJson(jsonStream));
            elasticsearchClient.indices().create(request);
        }

        LOGGER.info("Search index created", keyValue("action", "search_index_created"), keyValue("index", indexName));
    }
}
