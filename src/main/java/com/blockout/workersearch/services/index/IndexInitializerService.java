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
            logger.info("Deleting existing index",
                    keyValue("action", "delete_index"),
                    keyValue("index", indexName));
            elasticsearchClient.indices()
                    .delete(DeleteIndexRequest.of(d -> d.index(indexName)));
        }

        logger.info("Creating index from JSON config",
                keyValue("action", "create_index"),
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
                keyValue("action", "index_created"),
                keyValue("index", indexName));
    }
}