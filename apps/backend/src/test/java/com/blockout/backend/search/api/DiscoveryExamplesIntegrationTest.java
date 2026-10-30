package com.blockout.backend.search.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.search.application.SearchDocuments;
import com.blockout.backend.search.application.SearchEngine;
import com.blockout.backend.search.infrastructure.OpenSearchEngine;
import com.blockout.backend.search.infrastructure.SearchIndexProperties;
import com.blockout.backend.search.infrastructure.SearchTestEngine;
import com.blockout.backend.sporting.application.model.SportingPublicInput;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Generated collection reads against real current PostgreSQL owners and disposable TLS OpenSearch.
 */
@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Import({PostgresTestConfiguration.class, DiscoveryExamplesIntegrationTest.NativeEngine.class})
@DisplayName("Retained examples under current visibility")
class DiscoveryExamplesIntegrationTest {
  private static final String PREFIX = "blockout-local-search-" + UUID.randomUUID();
  private static final UUID SEASON = UUID.fromString("10000000-0000-4000-8000-000000000001");
  private static final UUID DIVISION = UUID.fromString("20000000-0000-4000-8000-000000000001");
  @Autowired PostgreSQLContainer database;
  @Autowired SearchTestEngine nativeEngine;
  @Autowired MockMvc mvc;
  @Autowired JsonMapper json;
  @Autowired JdbcTemplate sql;
  @Autowired ReadSportingData owners;

  /**
   * Replaces only this class's disposable SQL and index data with eight resources of every kind.
   */
  @BeforeEach
  void seedCurrentOwners() throws Exception {
    try (Connection connection =
            DriverManager.getConnection(
                database.getJdbcUrl().replace("/postgres", "/blockout"),
                "blockout_migration",
                "harmless-migration");
        Statement statement = connection.createStatement()) {
      statement.execute("TRUNCATE sporting_season, sporting_club, sporting_division CASCADE");
    }
    if (nativeEngine.client.indices().exists(r -> r.index(PREFIX + "-*")).value())
      nativeEngine.client.indices().delete(r -> r.index(PREFIX + "-*"));
    sql.update(
        "INSERT INTO sporting_season(id,start_year,label) VALUES (?,2026,'2026/2027')", SEASON);
    sql.update(
        "INSERT INTO sporting_division(id,name,active,color) VALUES (?,'Synthetic division',TRUE,'#112233')",
        DIVISION);
    sql.update(
        "INSERT INTO sporting_pack(id,season_id,provider,organizer_reference,reference) VALUES (?,?,'LNV','synthetic','pack')",
        id(9),
        SEASON);
    for (int number = 1; number <= 8; number++) {
      sql.update(
          "INSERT INTO sporting_club(id,provider,reference,source_name,municipality) VALUES (?,'FFVB',?,'Independent club','Lyon')",
          id(number),
          "club" + number);
      sql.update(
          "INSERT INTO sporting_pool(id,season_id,pack_id,provider,organizer_reference,competition_reference,reference,source_name,division_id,format,gender) VALUES (?,?,?,'LNV','synthetic','competition',?,'Synthetic pool',?,'_6X6','FEMALE')",
          id(number),
          SEASON,
          id(9),
          "pool" + number,
          DIVISION);
      sql.update(
          "INSERT INTO sporting_team(id,season_id,provider,organizer_reference,competition_reference,native_reference,source_name,comparison_name,division_id,format,gender) VALUES (?,?,'LNV','synthetic','competition',?,'Unattached team','unattached team',?,'_6X6','FEMALE')",
          id(number),
          SEASON,
          "team" + number,
          DIVISION);
      sql.update(
          "INSERT INTO sporting_participation(id,team_id,pool_id,current) VALUES (?,?,?,TRUE)",
          id(number),
          id(number),
          id(number));
    }
    for (Kind kind : List.of(Kind.CLUB, Kind.TEAM, Kind.POOL)) {
      String index = PREFIX + "-" + kind.name().toLowerCase() + "s";
      nativeEngine.createIndex(index);
      for (SportingPublicInput input : owners.publicInputs(kind, Set.copyOf(ids())))
        nativeEngine.client.index(
            r -> r.index(index).id(input.id().toString()).document(SearchDocuments.from(input)));
      nativeEngine.client.indices().refresh(r -> r.index(index));
    }
  }

  @ParameterizedTest
  @ValueSource(strings = {"clubs", "teams", "pools"})
  @DisplayName("Selects five examples in stable UUID order without any completeness metadata")
  void selectsStableExamples(String collection) throws Exception {
    // Given
    MockHttpServletRequestBuilder request = get("/" + collection).param("q", " \t\u2003");

    // When
    JsonNode response = read(request);

    // Then
    assertThat(identities(response, collection)).containsExactly(id(1), id(2), id(3), id(4), id(5));
    assertThat(response.propertyNames()).containsExactly(collection);
    if (collection.equals("teams"))
      assertThat(response.path(collection).get(0).hasNonNull("club")).isFalse();
  }

  @ParameterizedTest
  @ValueSource(strings = {"clubs", "teams", "pools"})
  @DisplayName("Rereads only retained identities in supplied order without replacements")
  void retainsSuppliedOrder(String collection) throws Exception {
    // Given: removal happens after projection; new eligible resources cannot fill the gap.
    sql.update("DELETE FROM sporting_participation WHERE team_id = ?", id(2));
    sql.update("DELETE FROM sporting_team WHERE id = ?", id(2));
    sql.update("DELETE FROM sporting_pool WHERE id = ?", id(2));
    sql.update("DELETE FROM sporting_club WHERE id = ?", id(2));

    // When
    JsonNode response =
        read(
            get("/" + collection)
                .param("exampleIds", id(5).toString(), id(2).toString(), id(1).toString()));

    // Then
    assertThat(identities(response, collection)).containsExactly(id(5), id(1));
    assertThat(response.propertyNames()).containsExactly(collection);
  }

  @ParameterizedTest
  @ValueSource(strings = {"teams", "pools"})
  @DisplayName("Applies every exact sporting filter to empty text and retained reads")
  void appliesExactFilters(String collection) throws Exception {
    // Given
    MockHttpServletRequestBuilder matching =
        get("/" + collection)
            .param("seasonId", SEASON.toString())
            .param("divisionId", DIVISION.toString())
            .param("format", "6x6")
            .param("gender", "female");

    // When
    JsonNode response = read(matching);

    // Then
    assertThat(identities(response, collection)).hasSize(5);
    for (String[] filter :
        List.of(
            new String[] {"seasonId", id(99).toString()},
            new String[] {"divisionId", id(99).toString()},
            new String[] {"format", "4x4"},
            new String[] {"gender", "male"})) {
      assertThat(identities(read(get("/" + collection).param(filter[0], filter[1])), collection))
          .isEmpty();
      assertThat(
              identities(
                  read(
                      get("/" + collection)
                          .param(filter[0], filter[1])
                          .param("exampleIds", id(1).toString())),
                  collection))
          .isEmpty();
    }
  }

  @ParameterizedTest
  @CsvSource({"clubs,city", "teams,participation", "teams,division", "pools,pool"})
  @DisplayName("Current restrictions remove every retained identity without replacement")
  void removesRestrictedSelection(String collection, String restriction) throws Exception {
    // Given
    switch (restriction) {
      case "city" -> sql.update("UPDATE sporting_club SET municipality_restricted = TRUE");
      case "participation" -> sql.update("UPDATE sporting_participation SET current = FALSE");
      case "division" -> sql.update("UPDATE sporting_division SET active = FALSE");
      case "pool" -> sql.update("UPDATE sporting_pool SET catalog_eligible = FALSE");
      default -> throw new IllegalArgumentException();
    }

    // When
    JsonNode response =
        read(get("/" + collection).param("exampleIds", id(1).toString(), id(2).toString()));

    // Then
    assertThat(identities(response, collection)).isEmpty();
    assertThat(response.propertyNames()).containsExactly(collection);
  }

  @Test
  @DisplayName("Initial selection skips stale cities before filling five current examples")
  void skipsStaleInitialCandidates() throws Exception {
    // Given
    for (UUID identity : List.of(id(1), id(2), id(3)))
      sql.update("UPDATE sporting_club SET municipality = 'Niort' WHERE id = ?", identity);

    // When
    JsonNode response = read(get("/clubs"));

    // Then
    assertThat(identities(response, "clubs")).containsExactly(id(4), id(5), id(6), id(7), id(8));
  }

  @Test
  @DisplayName("Rejects current filter drift even while the indexed classification still matches")
  void rejectsStaleClassification() throws Exception {
    // Given
    sql.update("UPDATE sporting_team SET gender = 'MALE' WHERE id = ?", id(1));

    // When
    JsonNode response =
        read(get("/teams").param("gender", "female").param("exampleIds", id(1).toString()));

    // Then
    assertThat(identities(response, "teams")).isEmpty();
  }

  @ParameterizedTest
  @ValueSource(strings = {"duplicates", "size", "type", "blank", "text", "cursor", "clubFilter"})
  @DisplayName("Rejects invalid retained shapes and forbidden mode combinations")
  void rejectsInvalidParameters(String scenario) throws Exception {
    // Given
    MockHttpServletRequestBuilder request = get("/clubs");
    switch (scenario) {
      case "duplicates" -> request.param("exampleIds", id(1).toString(), id(1).toString());
      case "size" ->
          request.param("exampleIds", ids().stream().map(UUID::toString).toArray(String[]::new));
      case "type" -> request.param("exampleIds", "not-a-uuid");
      case "blank" -> request.param("exampleIds", "");
      case "text" -> request.param("exampleIds", id(1).toString()).param("q", "club");
      case "cursor" -> request.param("exampleIds", id(1).toString()).param("cursor", "opaque");
      case "clubFilter" -> request.param("seasonId", SEASON.toString());
      default -> throw new IllegalArgumentException();
    }

    // When
    org.springframework.test.web.servlet.ResultActions result = mvc.perform(request);

    // Then
    result.andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("An unavailable native engine remains a failure rather than false absence")
  void reportsEngineFailure() throws Exception {
    // Given
    nativeEngine.client.indices().close(r -> r.index(PREFIX + "-clubs"));

    // When
    org.springframework.test.web.servlet.ResultActions result = mvc.perform(get("/clubs"));

    // Then
    result
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unavailable"));
  }

  /**
   * Performs the actual generated MVC route and decodes its successful current response.
   *
   * @param request scenario-owned collection parameters
   * @return decoded no-store public response
   */
  private JsonNode read(MockHttpServletRequestBuilder request) throws Exception {
    return json.readTree(
        mvc.perform(request)
            .andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andReturn()
            .getResponse()
            .getContentAsString());
  }

  /**
   * Extracts public identities without reordering the resource-specific generated envelope.
   *
   * @param response successful collection response
   * @param collection clubs, teams or pools for this scenario
   * @return returned resource UUIDs in presentation order
   */
  private List<UUID> identities(JsonNode response, String collection) {
    List<UUID> result = new ArrayList<>();
    String singular = collection.substring(0, collection.length() - 1);
    response
        .path(collection)
        .forEach(item -> result.add(UUID.fromString(item.path(singular).path("id").asText())));
    return result;
  }

  /**
   * Constructs a stable UUID in the fixture's explicit natural lexical order.
   *
   * @param number resource suffix used by the scenario
   * @return canonical deterministic UUID
   */
  private static UUID id(int number) {
    return UUID.fromString("00000000-0000-4000-8000-" + String.format("%012d", number));
  }

  /**
   * Returns the explicit fixture range; individual scenario identities remain visible in each test.
   */
  private static List<UUID> ids() {
    return java.util.stream.IntStream.rangeClosed(1, 8)
        .mapToObj(DiscoveryExamplesIntegrationTest::id)
        .toList();
  }

  /**
   * Owns this suite's engine and connects the real adapter without replacing business
   * collaborators.
   */
  @TestConfiguration(proxyBeanMethods = false)
  static class NativeEngine {
    /** Starts and releases a TLS engine with dynamic mapped ports for this context only. */
    @Bean(initMethod = "startEngine", destroyMethod = "close")
    SearchTestEngine nativeEngine() {
      return new SearchTestEngine();
    }

    /**
     * Connects current collection reads to the suite-owned native engine and namespace.
     *
     * @param nativeEngine context-owned disposable TLS engine
     * @return real production search adapter under a unique namespace
     */
    @Bean
    @Primary
    SearchEngine searchEngine(SearchTestEngine nativeEngine) {
      return new OpenSearchEngine(nativeEngine.client, new SearchIndexProperties(PREFIX));
    }
  }
}
