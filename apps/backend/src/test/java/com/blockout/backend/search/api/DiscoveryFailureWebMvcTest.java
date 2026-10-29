package com.blockout.backend.search.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.search.application.HydrateSearch;
import com.blockout.backend.search.application.ReadSearch;
import com.blockout.backend.search.application.ReadSearchOptions;
import com.blockout.backend.search.infrastructure.OpenSearchEngine;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.sporting.api.ConsultationApiMapperImpl;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.IntStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.stubbing.OngoingStubbing;
import org.opensearch.client.opensearch.OpenSearchClient;
import org.opensearch.client.opensearch._types.FieldValue;
import org.opensearch.client.opensearch.core.SearchRequest;
import org.opensearch.client.opensearch.core.SearchResponse;
import org.opensearch.client.opensearch.core.search.Hit;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.TransactionTimedOutException;

/**
 * Real generated MVC, traversal and native-adapter translation with controlled client/hydration
 * boundaries. These checks do not establish engine timing, database transactions or F12 admission.
 */
@WebMvcTest(DiscoveryController.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(OutputCaptureExtension.class)
@Import({
  DiscoveryRequest.class,
  DiscoveryApiMapperImpl.class,
  ConsultationApiMapperImpl.class,
  DiscoveryExceptionHandler.class,
  ApiExceptionHandler.class,
  ReadSearch.class,
  OpenSearchEngine.class
})
@DisplayName("Discovery safe read failures")
class DiscoveryFailureWebMvcTest {
  private static final String QUERY = "synthetic-query-marker";
  private static final String CITY = "synthetic-city-marker";
  private static final String PRIVATE_PAYLOAD =
      "synthetic-contact@example.invalid credential-marker raw-payload-marker";

  @Autowired private MockMvc mvc;
  @MockitoBean private OpenSearchClient client;
  @MockitoBean private HydrateSearch hydration;
  @MockitoBean private ReadSearchOptions options;

  @ParameterizedTest
  @ValueSource(strings = {"clubs", "teams", "pools"})
  @DisplayName("Returns safe unavailability when the native engine cannot be read")
  void rejectsEngineFailure(String collection, CapturedOutput output) throws Exception {
    // Given
    when(client.search(any(SearchRequest.class), eq(OpenSearchEngine.IndexedCity.class)))
        .thenThrow(new IOException(QUERY + " " + CITY + " " + PRIVATE_PAYLOAD));

    // When
    ResultActions response = mvc.perform(get("/" + collection).param("q", QUERY));

    // Then
    assertUnavailable(response);
    assertThat(output.getOut()).contains("search_candidates", "engine_failed");
    assertPrivateValuesAbsent(output);
    verifyNoInteractions(hydration);
  }

  @ParameterizedTest
  @CsvSource({"true, false, 1, 0", "false, false, 0, 1", "false, false, 0, 0", "false, true, 1, 0"})
  @DisplayName("Rejects timeout and incomplete shard evaluations even when a hit was returned")
  void rejectsIncompleteEvaluation(
      boolean timedOut,
      boolean terminatedEarly,
      int successfulShards,
      int failedShards,
      CapturedOutput output)
      throws Exception {
    // Given
    SearchResponse<OpenSearchEngine.IndexedCity> incomplete =
        new SearchResponse.Builder<OpenSearchEngine.IndexedCity>()
            .took(1)
            .timedOut(timedOut)
            .terminatedEarly(terminatedEarly)
            .shards(shards -> shards.total(1).successful(successfulShards).failed(failedShards))
            .hits(hits -> hits.hits(List.of(hit(1))))
            .build();
    when(client.search(any(SearchRequest.class), eq(OpenSearchEngine.IndexedCity.class)))
        .thenReturn(incomplete);

    // When
    ResultActions response = mvc.perform(get("/clubs").param("q", QUERY));

    // Then
    assertUnavailable(response);
    assertThat(output.getOut()).contains("search_candidates", "incomplete_response");
    assertPrivateValuesAbsent(output);
    verifyNoInteractions(hydration);
  }

  @Test
  @DisplayName("Rejects failed current hydration instead of returning candidate data")
  void rejectsHydrationFailure(CapturedOutput output) throws Exception {
    // Given
    when(client.search(any(SearchRequest.class), eq(OpenSearchEngine.IndexedCity.class)))
        .thenReturn(complete(List.of(hit(1))));
    when(hydration.current(any(), any())).thenThrow(new QueryTimeoutException(PRIVATE_PAYLOAD));

    // When
    ResultActions response = mvc.perform(get("/clubs").param("q", QUERY));

    // Then
    assertUnavailable(response);
    assertThat(output.getOut()).contains("search_hydration", "database_unavailable");
    assertPrivateValuesAbsent(output);
  }

  @Test
  @DisplayName("Rejects traversal without a useful outcome at the bound instead of claiming an end")
  void rejectsTraversalWithoutOutcome(CapturedOutput output) throws Exception {
    // Given
    OngoingStubbing<SearchResponse<OpenSearchEngine.IndexedCity>> batches =
        when(client.search(any(SearchRequest.class), eq(OpenSearchEngine.IndexedCity.class)));
    for (int batch = 0; batch < 10; batch++) {
      List<Hit<OpenSearchEngine.IndexedCity>> hits =
          IntStream.rangeClosed(batch * 200 + 1, (batch + 1) * 200)
              .mapToObj(DiscoveryFailureWebMvcTest::hit)
              .toList();
      batches = batches.thenReturn(complete(hits));
    }
    when(hydration.current(any(), any())).thenReturn(Map.of());

    // When
    ResultActions response = mvc.perform(get("/clubs").param("q", QUERY));

    // Then
    assertUnavailable(response);
    assertThat(output.getOut()).contains("search_traversal", "evaluation_bound");
    assertPrivateValuesAbsent(output);
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  @DisplayName("Returns retryable unavailability for options query or transaction timeout")
  void rejectsOptionsTimeout(boolean transactionTimeout, CapturedOutput output) throws Exception {
    // Given
    RuntimeException failure =
        transactionTimeout
            ? new TransactionTimedOutException(PRIVATE_PAYLOAD)
            : new QueryTimeoutException(PRIVATE_PAYLOAD);
    when(options.read(any())).thenThrow(failure);

    // When
    ResultActions response =
        mvc.perform(get("/sporting-search-options").param("resourceType", "team"));

    // Then
    assertUnavailable(response);
    assertThat(output.getOut()).contains("search_options", "unavailable");
    assertPrivateValuesAbsent(output);
    verifyNoInteractions(client, hydration);
  }

  @Test
  @DisplayName("Keeps a completed empty evaluation distinct from unavailability")
  void returnsSuccessfulEmptyEvaluation() throws Exception {
    // Given
    when(client.search(any(SearchRequest.class), eq(OpenSearchEngine.IndexedCity.class)))
        .thenReturn(complete(List.of()));

    // When
    ResultActions response = mvc.perform(get("/clubs").param("q", QUERY));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.clubs").isEmpty())
        .andExpect(jsonPath("$.nextCursor").doesNotExist());
    verifyNoInteractions(hydration);
  }

  /**
   * Asserts the complete opaque shared problem, with no successful collection or continuation.
   *
   * @param response actual controller response after a failed read
   */
  private static void assertUnavailable(ResultActions response) throws Exception {
    response
        .andExpect(status().isServiceUnavailable())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(
            content()
                .json(
                    "{\"type\":\"urn:blockout:problem:unavailable\",\"title\":\"Service Unavailable\",\"status\":503}",
                    org.springframework.test.json.JsonCompareMode.STRICT));
  }

  /**
   * Confirms neither operational logging nor exception rendering exposes synthetic private data.
   *
   * @param output captured application diagnostics for the scenario
   */
  private static void assertPrivateValuesAbsent(CapturedOutput output) {
    assertThat(output.getAll())
        .doesNotContain(
            QUERY,
            CITY,
            "synthetic-contact@example.invalid",
            "credential-marker",
            "raw-payload-marker");
  }

  /**
   * Builds a genuine native hit whose indexed city must never become an error diagnostic.
   *
   * @param number stable identity suffix controlling native order
   * @return a native score/identity boundary with a synthetic source value
   */
  private static Hit<OpenSearchEngine.IndexedCity> hit(int number) {
    String id = new UUID(0, number).toString();
    return new Hit.Builder<OpenSearchEngine.IndexedCity>()
        .index("isolated-search-clubs")
        .id(id)
        .sort(List.of(FieldValue.of(1.0), FieldValue.of(id)))
        .source(new OpenSearchEngine.IndexedCity(CITY))
        .build();
  }

  /**
   * Builds a complete engine evaluation; result count alone determines candidate exhaustion.
   *
   * @param hits ordered candidates evaluated successfully by the controlled engine
   * @return a genuine complete native response
   */
  private static SearchResponse<OpenSearchEngine.IndexedCity> complete(
      List<Hit<OpenSearchEngine.IndexedCity>> hits) {
    return new SearchResponse.Builder<OpenSearchEngine.IndexedCity>()
        .took(1)
        .timedOut(false)
        .shards(shards -> shards.total(1).successful(1).failed(0))
        .hits(results -> results.hits(hits))
        .build();
  }
}
