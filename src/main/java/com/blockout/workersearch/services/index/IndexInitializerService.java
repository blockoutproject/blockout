package com.blockout.workersearch.services.index;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.indices.CreateIndexRequest;
import co.elastic.clients.elasticsearch.indices.DeleteIndexRequest;
import co.elastic.clients.elasticsearch.indices.ExistsRequest;
import co.elastic.clients.transport.endpoints.BooleanResponse;

import java.io.InputStream;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class IndexInitializerService {

    private static final Logger logger = LoggerFactory.getLogger(IndexInitializerService.class);

    private final ElasticsearchClient elasticsearchClient;

    @PostConstruct
    @SneakyThrows
    public void initializeTeamIndex() {
        String indexName = "teams";
        String jsonPath = "elasticsearch/teams-index.json";

        // Check if index exists
        BooleanResponse exists = elasticsearchClient.indices()
                .exists(ExistsRequest.of(e -> e.index(indexName)));

        if (exists.value()) {
            logger.info("Deleting existing teams index",
                    keyValue("action", "delete_teams_index"),
                    keyValue("index", indexName));
            elasticsearchClient.indices()
                    .delete(DeleteIndexRequest.of(d -> d.index(indexName)));
        }

        logger.info("Creating teams index from JSON config",
                keyValue("action", "create_teams_index"),
                keyValue("index", indexName),
                keyValue("source", jsonPath));

        // Load JSON config
        InputStream jsonStream = new ClassPathResource(jsonPath).getInputStream();

        // Create the index
        CreateIndexRequest createIndexRequest = CreateIndexRequest.of(b -> b
                .index(indexName)
                .withJson(jsonStream)
        );

        elasticsearchClient.indices().create(createIndexRequest);

        logger.info("Index created successfully",
                keyValue("action", "index_teams_created"),
                keyValue("index", indexName));
    }

    @PostConstruct
    @SneakyThrows
    public void initializeClubIndex() {
        String indexName = "clubs";
        String jsonPath = "elasticsearch/clubs-index.json";

        // Check if index exists
        BooleanResponse exists = elasticsearchClient.indices()
                .exists(ExistsRequest.of(e -> e.index(indexName)));

        if (exists.value()) {
            logger.info("Deleting existing clubs index",
                    keyValue("action", "delete_clubs_index"),
                    keyValue("index", indexName));
            elasticsearchClient.indices()
                    .delete(DeleteIndexRequest.of(d -> d.index(indexName)));
        }

        logger.info("Creating clubs index from JSON config",
                keyValue("action", "create_clubs_index"),
                keyValue("index", indexName),
                keyValue("source", jsonPath));

        // Load JSON config
        InputStream jsonStream = new ClassPathResource(jsonPath).getInputStream();

        // Create the index
        CreateIndexRequest createIndexRequest = CreateIndexRequest.of(b -> b
                .index(indexName)
                .withJson(jsonStream)
        );

        elasticsearchClient.indices().create(createIndexRequest);

        logger.info("Index clubs created successfully",
                keyValue("action", "index_clubs_created"),
                keyValue("index", indexName));
    }
}