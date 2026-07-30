package com.blockout.workersearch.projection.infrastructure.elasticsearch;

import static org.assertj.core.api.Assertions.assertThat;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import com.blockout.workersearch.config.ElasticsearchConfig;
import com.blockout.workersearch.config.ElasticsearchProperties;
import com.blockout.workersearch.projection.application.models.ClubSearchProjection;
import com.blockout.workersearch.projection.infrastructure.elasticsearch.repositories.ClubSearchRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.elasticsearch.repository.config.EnableElasticsearchRepositories;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.elasticsearch.ElasticsearchContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

@SpringBootTest(classes = ElasticsearchProjectionIndexIntegrationTest.TestApplication.class)
@Testcontainers
@DisplayName("Elasticsearch projection index integration")
class ElasticsearchProjectionIndexIntegrationTest {

  @Container
  static final ElasticsearchContainer elasticsearch =
      new ElasticsearchContainer(
              DockerImageName.parse("docker.elastic.co/elasticsearch/elasticsearch:9.4.2"))
          .withEnv("xpack.security.enabled", "false")
          .withEnv("xpack.security.http.ssl.enabled", "false");

  @Autowired private ElasticsearchClient elasticsearchClient;

  @Autowired private ElasticsearchIndexInitializer indexInitializer;

  @Autowired private ElasticsearchProjectionIndex projectionIndex;

  @Autowired private ClubSearchRepository clubSearchRepository;

  @DynamicPropertySource
  static void elasticsearchProperties(DynamicPropertyRegistry registry) {
    registry.add("elasticsearch.host", elasticsearch::getHttpHostAddress);
    registry.add("elasticsearch.username", () -> "unused");
    registry.add("elasticsearch.password", () -> "unused");
  }

  @BeforeEach
  void resetIndices() {
    indexInitializer.initializeClubIndex();
    indexInitializer.initializeTeamIndex();
    indexInitializer.initializePoolIndex();
  }

  @Test
  @DisplayName("recreates every owned index idempotently")
  void recreatesEveryOwnedIndexIdempotently() throws Exception {
    indexInitializer.initializeClubIndex();
    indexInitializer.initializeTeamIndex();
    indexInitializer.initializePoolIndex();

    assertThat(elasticsearchClient.indices().exists(request -> request.index("clubs")).value())
        .isTrue();
    assertThat(elasticsearchClient.indices().exists(request -> request.index("teams")).value())
        .isTrue();
    assertThat(elasticsearchClient.indices().exists(request -> request.index("pools")).value())
        .isTrue();
  }

  @Test
  @DisplayName("persists a projection through the production index")
  void persistsProjectionThroughProductionIndex() {
    projectionIndex.saveClubs(
        List.of(
            new ClubSearchProjection(
                "club-1", "https://example.test/original.png", "Original Club", "Paris")));

    assertThat(clubSearchRepository.findById("club-1"))
        .get()
        .extracting("name", "city")
        .containsExactly("Original Club", "Paris");
  }

  @Test
  @DisplayName("replaces a projection with the same identifier")
  void replacesProjectionWithSameIdentifier() {
    projectionIndex.saveClubs(
        List.of(
            new ClubSearchProjection(
                "club-1", "https://example.test/original.png", "Original Club", "Paris")));

    projectionIndex.saveClubs(
        List.of(
            new ClubSearchProjection(
                "club-1", "https://example.test/updated.png", "Updated Club", "Lyon")));

    assertThat(clubSearchRepository.findById("club-1"))
        .get()
        .extracting("name", "city", "logoUrl")
        .containsExactly("Updated Club", "Lyon", "https://example.test/updated.png");
  }

  @Test
  @DisplayName("deletes a projection through the production index")
  void deletesProjectionThroughProductionIndex() {
    projectionIndex.saveClubs(
        List.of(
            new ClubSearchProjection(
                "club-1", "https://example.test/club.png", "Club to delete", "Paris")));

    projectionIndex.deleteClub("club-1");

    assertThat(clubSearchRepository.findById("club-1")).isEmpty();
  }

  @SpringBootConfiguration
  @EnableConfigurationProperties(ElasticsearchProperties.class)
  @EnableElasticsearchRepositories(basePackageClasses = ClubSearchRepository.class)
  @Import({
    ElasticsearchConfig.class,
    ElasticsearchIndexInitializer.class,
    ElasticsearchProjectionIndex.class
  })
  static class TestApplication {}
}
