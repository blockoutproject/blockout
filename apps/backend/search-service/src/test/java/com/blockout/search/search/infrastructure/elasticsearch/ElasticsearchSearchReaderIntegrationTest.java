package com.blockout.search.search.infrastructure.elasticsearch;

import static org.assertj.core.api.Assertions.assertThat;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.Refresh;
import com.blockout.search.config.ElasticsearchConfig;
import com.blockout.search.config.ElasticsearchProperties;
import com.blockout.search.search.infrastructure.elasticsearch.documents.ClubSearchDocument;
import java.io.StringReader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.elasticsearch.ElasticsearchContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

@SpringBootTest(classes = ElasticsearchSearchReaderIntegrationTest.TestApplication.class)
@Testcontainers
@DisplayName("Elasticsearch search reader integration")
class ElasticsearchSearchReaderIntegrationTest {

  private static final String CLUBS_INDEX = "clubs";

  @Container
  static final ElasticsearchContainer elasticsearch =
      new ElasticsearchContainer(
              DockerImageName.parse("docker.elastic.co/elasticsearch/elasticsearch:8.15.5"))
          .withEnv("xpack.security.enabled", "false")
          .withEnv("xpack.security.http.ssl.enabled", "false");

  @Autowired private ElasticsearchClient elasticsearchClient;

  @Autowired private ElasticsearchSearchReader searchReader;

  @DynamicPropertySource
  static void elasticsearchProperties(DynamicPropertyRegistry registry) {
    registry.add("elasticsearch.host", elasticsearch::getHttpHostAddress);
    registry.add("elasticsearch.username", () -> "unused");
    registry.add("elasticsearch.password", () -> "unused");
  }

  @BeforeEach
  void createClubsIndex() throws Exception {
    var exists = elasticsearchClient.indices().exists(request -> request.index(CLUBS_INDEX));
    if (exists.value()) {
      elasticsearchClient.indices().delete(request -> request.index(CLUBS_INDEX));
    }

    var mapping =
        """
        {
          "mappings": {
            "properties": {
              "id": { "type": "keyword" },
              "name": { "type": "search_as_you_type", "copy_to": ["all"] },
              "city": { "type": "search_as_you_type", "copy_to": ["all"] },
              "logoUrl": { "type": "keyword" },
              "all": { "type": "text" }
            }
          }
        }
        """;
    elasticsearchClient
        .indices()
        .create(request -> request.index(CLUBS_INDEX).withJson(new StringReader(mapping)));
  }

  @Test
  @DisplayName("queries a real index through the production search reader")
  void queriesRealIndexThroughProductionSearchReader() throws Exception {
    elasticsearchClient.index(
        request ->
            request
                .index(CLUBS_INDEX)
                .id("paris")
                .document(
                    new ClubSearchDocument(
                        "paris", "Blockout Paris", "https://example.test/paris.png", "Paris"))
                .refresh(Refresh.True));
    elasticsearchClient.index(
        request ->
            request
                .index(CLUBS_INDEX)
                .id("lyon")
                .document(
                    new ClubSearchDocument(
                        "lyon", "Blockout Lyon", "https://example.test/lyon.png", "Lyon"))
                .refresh(Refresh.True));

    var results = searchReader.searchClubs("paris");

    assertThat(results).extracting("id").containsExactly("paris");
  }

  @SpringBootConfiguration
  @EnableConfigurationProperties(ElasticsearchProperties.class)
  @Import({ElasticsearchConfig.class, ElasticsearchSearchReader.class})
  static class TestApplication {}
}
