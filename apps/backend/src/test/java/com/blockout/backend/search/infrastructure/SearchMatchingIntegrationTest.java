package com.blockout.backend.search.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.search.application.SearchContext;
import com.blockout.backend.search.application.SearchDocuments;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Native committed analyzers and complete whole-query branches against the pinned engine. */
@DisplayName("Native search matching")
class SearchMatchingIntegrationTest {
  private static final SearchTestEngine NATIVE = new SearchTestEngine();
  private OpenSearchEngine engine;
  private String prefix;

  /** Starts this suite's isolated engine; each scenario owns its mapped team index. */
  @BeforeAll
  static void start() throws Exception {
    NATIVE.startEngine();
  }

  /** Gives each scenario an empty mapped index; no ranking evidence inherits earlier documents. */
  @BeforeEach
  void createIndex() throws Exception {
    prefix = "blockout-local-search-" + UUID.randomUUID();
    NATIVE.createIndex(prefix + "-teams");
    engine = new OpenSearchEngine(NATIVE.client, new SearchIndexProperties(prefix));
  }

  /** Removes this scenario's index after every outcome. */
  @AfterEach
  void deleteIndex() throws Exception {
    NATIVE.client.indices().delete(request -> request.index(prefix + "-teams"));
  }

  /** Releases only this suite's native client and engine. */
  @AfterAll
  static void stop() throws Exception {
    NATIVE.close();
  }

  @Test
  @DisplayName(
      "Matches complete prefix and fuzzy branches across fields while retaining whole query terms")
  void matchesWholeQuery() throws Exception {
    // Given
    UUID eagles = UUID.fromString("00000000-0000-4000-8000-000000000001");
    index(eagles, "Éagles Volley", "Lyon");
    index(UUID.fromString("00000000-0000-4000-8000-000000000002"), "Elephants", "Lille");
    NATIVE.client.indices().refresh(r -> r.index(prefix + "-teams"));

    // When
    List<UUID> prefixes = ids("  ÉAG  ly ");
    List<UUID> whole = ids("Eagles Lyon");
    List<UUID> typo = ids("Volly Lyon");

    // Then
    assertThat(prefixes).containsExactly(eagles);
    assertThat(whole).containsExactly(eagles);
    assertThat(typo).containsExactly(eagles);
    assertThat(ids("Eagles Marseille")).isEmpty();
    assertThat(ids("... !!!")).isEmpty();
  }

  @Test
  @DisplayName("Retains full and intermediate 200-character prefixes after ligature folding")
  void matchesExpandedPrefixes() throws Exception {
    // Given
    UUID identity = UUID.fromString("00000000-0000-4000-8000-000000000003");
    index(identity, "ﬃ".repeat(200), null);
    NATIVE.client.indices().refresh(r -> r.index(prefix + "-teams"));

    // When
    List<UUID> intermediate = ids("ﬃ".repeat(199));
    List<UUID> full = ids("ﬃ".repeat(200));

    // Then
    assertThat(intermediate).containsExactly(identity);
    assertThat(full).containsExactly(identity);
  }

  /**
   * Indexes only deliberate synthetic public fields with the native client.
   *
   * @param id stable synthetic identity
   * @param name scenario matching text
   * @param city scenario authorized city, or null
   */
  private void index(UUID id, String name, String city) throws Exception {
    SearchDocuments document =
        new SearchDocuments(id, List.of(name), List.of(), city, null, null, null, null);
    NATIVE.client.index(r -> r.index(prefix + "-teams").id(id.toString()).document(document));
  }

  /**
   * Reads identities from the real native engine without current SQL hydration.
   *
   * @param text complete textual query
   * @return native identities in relevance order
   */
  private List<UUID> ids(String text) {
    SearchContext context =
        new SearchContext(SearchContext.Resource.TEAM, text, null, null, null, null, false);
    return engine.search(context, null, 200).candidates().stream()
        .map(c -> c.position().id())
        .toList();
  }

  @Test
  @DisplayName(
      "Keeps aliases and division terms on their own resource while enforcing every exact filter")
  void appliesStrictFilters() throws Exception {
    // Given
    UUID id = UUID.fromString("00000000-0000-4000-8000-000000000004");
    UUID season = UUID.fromString("00000000-0000-4000-8000-000000000010");
    UUID division = UUID.fromString("00000000-0000-4000-8000-000000000020");
    SearchDocuments document =
        new SearchDocuments(
            id,
            List.of("Public Comets", "Source Comets", "Verified Comets"),
            List.of("Nationale Deux", "N2", "féminin", "6x6"),
            "Nice",
            season,
            division,
            "6x6",
            "female");
    NATIVE.client.index(r -> r.index(prefix + "-teams").id(id.toString()).document(document));
    NATIVE.client.indices().refresh(r -> r.index(prefix + "-teams"));
    SearchContext exact =
        new SearchContext(
            SearchContext.Resource.TEAM,
            "verified n2 feminin 6x6",
            season,
            division,
            com.blockout.backend.generated.mobile.model.SportFormatEnum._6X6,
            com.blockout.backend.generated.mobile.model.SportGenderEnum.FEMALE,
            false);

    // When
    List<UUID> matches =
        engine.search(exact, null, 200).candidates().stream().map(c -> c.position().id()).toList();

    // Then
    assertThat(matches).containsExactly(id);
    assertThat(ids("Public Comets")).containsExactly(id);
    assertThat(ids("Source Comets")).containsExactly(id);
    assertThat(ids("eagles n2")).isEmpty();
    for (SearchContext wrong :
        List.of(
            new SearchContext(
                SearchContext.Resource.TEAM,
                exact.text(),
                UUID.randomUUID(),
                division,
                exact.format(),
                exact.gender(),
                false),
            new SearchContext(
                SearchContext.Resource.TEAM,
                exact.text(),
                season,
                UUID.randomUUID(),
                exact.format(),
                exact.gender(),
                false),
            new SearchContext(
                SearchContext.Resource.TEAM,
                exact.text(),
                season,
                division,
                com.blockout.backend.generated.mobile.model.SportFormatEnum._4X4,
                exact.gender(),
                false),
            new SearchContext(
                SearchContext.Resource.TEAM,
                exact.text(),
                season,
                division,
                exact.format(),
                com.blockout.backend.generated.mobile.model.SportGenderEnum.MALE,
                false))) {
      assertThat(engine.search(wrong, null, 200).candidates()).isEmpty();
    }
  }

  @Test
  @DisplayName("Favors a direct name over the same small typo in comparable context")
  void favorsDirectMatch() throws Exception {
    // Given
    UUID direct = UUID.fromString("00000000-0000-4000-8000-000000000005");
    UUID fuzzy = UUID.fromString("00000000-0000-4000-8000-000000000006");
    index(direct, "Volly", "Paris");
    index(fuzzy, "Volley", "Paris");
    NATIVE.client.indices().refresh(r -> r.index(prefix + "-teams"));

    // When
    List<UUID> matches = ids("volly paris");

    // Then
    assertThat(matches).containsExactly(direct, fuzzy);
  }

  @Test
  @DisplayName("Retains distinct identities with identical names")
  void preservesNamesakes() throws Exception {
    // Given
    UUID first = UUID.fromString("00000000-0000-4000-8000-000000000007");
    UUID second = UUID.fromString("00000000-0000-4000-8000-000000000008");
    index(first, "Namesakes", null);
    index(second, "Namesakes", null);
    NATIVE.client.indices().refresh(r -> r.index(prefix + "-teams"));

    // When
    List<UUID> matches = ids("namesakes");

    // Then
    assertThat(matches).containsExactly(first, second);
  }
}
