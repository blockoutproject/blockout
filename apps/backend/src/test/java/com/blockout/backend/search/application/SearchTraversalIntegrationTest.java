package com.blockout.backend.search.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.search.infrastructure.OpenSearchEngine;
import com.blockout.backend.search.infrastructure.SearchIndexProperties;
import com.blockout.backend.search.infrastructure.SearchTestEngine;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import com.blockout.backend.testsupport.PostgresTestDatabase;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.opensearch.client.opensearch.core.BulkRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Real generated HTTP, PostgreSQL owner hydration and native OpenSearch traversal on stable data.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Import(SearchTraversalIntegrationTest.NativeEngine.class)
@DisplayName("Complete current search traversal")
class SearchTraversalIntegrationTest {
  @Container static final PostgreSQLContainer DATABASE = PostgresTestDatabase.create();
  private static final String PREFIX = "blockout-local-search-" + UUID.randomUUID();
  @Autowired SearchTestEngine nativeEngine;
  @Autowired MockMvc mvc;
  @Autowired JsonMapper json;
  @Autowired JdbcTemplate sql;
  @Autowired ReadSportingData owners;

  /**
   * Migrates the real owner schema before restricted-role startup.
   *
   * @param properties native registry for this suite's disposable database settings
   */
  @DynamicPropertySource
  static void database(DynamicPropertyRegistry properties) throws Exception {
    PostgresTestDatabase.migrate(DATABASE);
    PostgresTestDatabase.registerApplicationProperties(DATABASE, properties);
  }

  /** Resets SQL owners and the native generation so parameterized runs never share documents. */
  @BeforeEach
  void resetOwnersAndIndex() throws Exception {
    try (java.sql.Connection connection =
            java.sql.DriverManager.getConnection(
                DATABASE.getJdbcUrl().replace("/postgres", "/blockout"),
                "blockout_migration",
                "harmless-migration");
        java.sql.Statement statement = connection.createStatement()) {
      statement.execute("TRUNCATE sporting_season, sporting_club, sporting_division CASCADE");
    }
    if (nativeEngine.client.indices().exists(request -> request.index(PREFIX + "-*")).value()) {
      nativeEngine.client.indices().delete(request -> request.index(PREFIX + "-*"));
    }
    nativeEngine.createIndex(PREFIX + "-clubs-v1");
    nativeEngine
        .client
        .indices()
        .updateAliases(
            request ->
                request.actions(
                    action ->
                        action.add(
                            alias -> alias.index(PREFIX + "-clubs-v1").alias(PREFIX + "-clubs"))));
  }

  @ParameterizedTest
  @ValueSource(ints = {47, 10001})
  @DisplayName("Traverses every eligible identity once beyond the ordinary result window")
  void traversesCompleteSet(int count) throws Exception {
    // Given
    String term = count == 47 ? "smallset" : "largeset";
    sql.update(
        "INSERT INTO sporting_club(id, provider, reference, source_name, municipality) SELECT md5(? || n::TEXT)::UUID, 'FFVB', ? || n::TEXT, ?, 'Lyon' FROM generate_series(1, ?) n",
        term,
        term,
        term,
        count + 7);
    List<UUID> expected =
        sql.query(
            "SELECT id FROM sporting_club WHERE source_name = ? ORDER BY id",
            (row, index) -> row.getObject(1, UUID.class),
            term);
    for (int offset = 0; offset < expected.size(); offset += 200) {
      List<UUID> ids = expected.subList(offset, Math.min(expected.size(), offset + 200));
      BulkRequest.Builder bulk = new BulkRequest.Builder();
      owners
          .publicInputs(Kind.CLUB, new HashSet<>(ids))
          .forEach(
              input ->
                  bulk.operations(
                      op ->
                          op.index(
                              i ->
                                  i.index(PREFIX + "-clubs")
                                      .id(input.id().toString())
                                      .document(SearchDocuments.from(input)))));
      assertThat(nativeEngine.client.bulk(bulk.build()).errors()).isFalse();
    }
    List<UUID> stale = List.copyOf(expected.subList(2, 9));
    for (UUID id : stale)
      sql.update("UPDATE sporting_club SET municipality_restricted = TRUE WHERE id = ?", id);
    expected = expected.stream().filter(id -> !stale.contains(id)).toList();
    nativeEngine.client.indices().refresh(r -> r.index(PREFIX + "-clubs"));
    List<UUID> seen = new ArrayList<>();
    String cursor = null;

    // When
    do {
      org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request =
          get("/clubs").param("q", term);
      if (cursor != null) request.param("cursor", cursor);
      JsonNode page =
          json.readTree(
              mvc.perform(request)
                  .andExpect(status().isOk())
                  .andReturn()
                  .getResponse()
                  .getContentAsString());
      assertThat(page.path("clubs").size()).isBetween(1, 20);
      page.path("clubs")
          .forEach(item -> seen.add(UUID.fromString(item.path("club").path("id").asText())));
      cursor = page.hasNonNull("nextCursor") ? page.path("nextCursor").asText() : null;
    } while (cursor != null);

    // Then
    assertThat(seen)
        .hasSize(count)
        .doesNotHaveDuplicates()
        .containsExactlyInAnyOrderElementsOf(expected);
  }

  @org.junit.jupiter.api.Test
  @DisplayName("A fresh traversal observes the replacement generation and current SQL identities")
  void restartsAfterGenerationChange() throws Exception {
    // Given
    String term = "replacement";
    UUID first = UUID.fromString("00000000-0000-4000-8000-000000000091");
    UUID second = UUID.fromString("00000000-0000-4000-8000-000000000092");
    for (UUID id : List.of(first, second))
      sql.update(
          "INSERT INTO sporting_club(id, provider, reference, source_name, municipality) VALUES (?, 'FFVB', ?, ?, 'Lyon')",
          id,
          id.toString(),
          term);
    for (com.blockout.backend.sporting.application.model.SportingPublicInput input :
        owners.publicInputs(Kind.CLUB, Set.of(first, second)))
      nativeEngine.client.index(
          r ->
              r.index(PREFIX + "-clubs")
                  .id(input.id().toString())
                  .document(SearchDocuments.from(input)));
    nativeEngine.client.indices().refresh(r -> r.index(PREFIX + "-clubs"));
    mvc.perform(get("/clubs").param("q", term))
        .andExpect(status().isOk())
        .andExpect(
            org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath(
                    "$.clubs.length()")
                .value(2));
    sql.update("DELETE FROM sporting_club WHERE id = ?", first);
    nativeEngine.createIndex(PREFIX + "-clubs-v2");
    com.blockout.backend.sporting.application.model.SportingPublicInput remaining =
        owners.publicInputs(Kind.CLUB, Set.of(second)).getFirst();
    nativeEngine.client.index(
        r ->
            r.index(PREFIX + "-clubs-v2")
                .id(second.toString())
                .document(SearchDocuments.from(remaining)));
    nativeEngine.client.indices().refresh(r -> r.index(PREFIX + "-clubs-v2"));

    // When
    nativeEngine
        .client
        .indices()
        .updateAliases(
            r ->
                r.actions(
                        a ->
                            a.remove(
                                remove ->
                                    remove.index(PREFIX + "-clubs-v1").alias(PREFIX + "-clubs")))
                    .actions(
                        a ->
                            a.add(
                                add -> add.index(PREFIX + "-clubs-v2").alias(PREFIX + "-clubs"))));
    JsonNode page =
        json.readTree(
            mvc.perform(get("/clubs").param("q", term))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());

    // Then
    assertThat(page.path("clubs").size()).isEqualTo(1);
    assertThat(page.path("clubs").get(0).path("club").path("id").asText())
        .isEqualTo(second.toString());
    assertThat(page.hasNonNull("nextCursor")).isFalse();
  }

  @org.junit.jupiter.api.Test
  @DisplayName("Returns retryable HTTP failure when stale candidates exhaust the evaluation bound")
  void refusesBoundAsEmpty() throws Exception {
    // Given
    String term = "boundcase";
    sql.update(
        "INSERT INTO sporting_club(id, provider, reference, source_name, municipality) SELECT md5(? || n::TEXT)::UUID, 'FFVB', ? || n::TEXT, ?, 'Lyon' FROM generate_series(1, 2001) n",
        term,
        term,
        term);
    List<UUID> ids =
        sql.query(
            "SELECT id FROM sporting_club WHERE source_name = ? ORDER BY id",
            (row, index) -> row.getObject(1, UUID.class),
            term);
    for (int offset = 0; offset < ids.size(); offset += 200) {
      BulkRequest.Builder bulk = new BulkRequest.Builder();
      owners
          .publicInputs(
              Kind.CLUB, new HashSet<>(ids.subList(offset, Math.min(offset + 200, ids.size()))))
          .forEach(
              input ->
                  bulk.operations(
                      op ->
                          op.index(
                              write ->
                                  write
                                      .index(PREFIX + "-clubs")
                                      .id(input.id().toString())
                                      .document(SearchDocuments.from(input)))));
      assertThat(nativeEngine.client.bulk(bulk.build()).errors()).isFalse();
    }
    sql.update(
        "UPDATE sporting_club SET municipality_restricted = TRUE WHERE source_name = ?", term);
    nativeEngine.client.indices().refresh(r -> r.index(PREFIX + "-clubs"));

    // When
    org.springframework.test.web.servlet.ResultActions response =
        mvc.perform(get("/clubs").param("q", term));

    // Then
    response
        .andExpect(status().isServiceUnavailable())
        .andExpect(
            org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.type")
                .value("urn:blockout:problem:unavailable"))
        .andExpect(
            org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                .string("Cache-Control", "no-store"));
  }

  @org.junit.jupiter.api.Test
  @DisplayName("An actual unavailable engine index is a retryable HTTP error")
  void refusesEngineFailure() throws Exception {
    // Given
    nativeEngine.client.indices().close(r -> r.index(PREFIX + "-clubs"));
    try {
      // When
      org.springframework.test.web.servlet.ResultActions response =
          mvc.perform(get("/clubs").param("q", "eagles"));

      // Then
      response
          .andExpect(status().isServiceUnavailable())
          .andExpect(
              org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.type")
                  .value("urn:blockout:problem:unavailable"));
    } finally {
      nativeEngine.client.indices().open(r -> r.index(PREFIX + "-clubs"));
    }
  }

  /** Installs only a real engine port; current owner, controller and mapping beans stay real. */
  @TestConfiguration(proxyBeanMethods = false)
  static class NativeEngine {
    /** Starts one engine owned and closed by this Spring context. */
    @Bean(initMethod = "startEngine", destroyMethod = "close")
    SearchTestEngine nativeEngine() {
      return new SearchTestEngine();
    }

    /**
     * Connects the production search adapter to the context-owned engine.
     *
     * @param nativeEngine real TLS transport; each scenario installs its empty mapped generation
     * @return native search adapter used by the actual MVC/application path
     */
    @Bean
    @Primary
    SearchEngine searchEngine(SearchTestEngine nativeEngine) {
      return new OpenSearchEngine(nativeEngine.client, new SearchIndexProperties(PREFIX));
    }
  }
}
