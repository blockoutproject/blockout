package com.blockout.backend.search.infrastructure;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.blockout.backend.search.application.SearchContext;
import com.blockout.backend.search.application.SearchUnavailableException;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.opensearch.client.opensearch.OpenSearchClient;
import org.opensearch.client.opensearch.core.SearchRequest;
import org.opensearch.client.opensearch.core.SearchResponse;

/** Real native response values qualify incomplete evaluation without depending on engine timing. */
@DisplayName("Native search failure translation")
class OpenSearchEngineTest {
  @ParameterizedTest
  @CsvSource({
    "true,  false, 1, 0",
    "false, false, 0, 1",
    "false, false, 0, 0",
    "false, true,  1, 0"
  })
  @DisplayName("Rejects incomplete responses instead of publishing successful exhaustion")
  void rejectsIncompleteResponse(
      boolean timedOut, boolean terminatedEarly, int successfulShards, int failedShards)
      throws Exception {
    // Given
    OpenSearchClient client = mock(OpenSearchClient.class);
    SearchResponse<OpenSearchEngine.IndexedCity> response =
        new SearchResponse.Builder<OpenSearchEngine.IndexedCity>()
            .took(1)
            .timedOut(timedOut)
            .terminatedEarly(terminatedEarly)
            .shards(shards -> shards.total(1).successful(successfulShards).failed(failedShards))
            .hits(hits -> hits.hits(List.of()))
            .build();
    when(client.search(any(SearchRequest.class), eq(OpenSearchEngine.IndexedCity.class)))
        .thenReturn(response);
    OpenSearchEngine engine =
        new OpenSearchEngine(client, new SearchIndexProperties("blockout-local-search"));
    SearchContext context =
        new SearchContext(SearchContext.Resource.CLUB, "eagles", null, null, null, null, false);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable read =
        () -> engine.search(context, null, 200);

    // Then
    assertThatThrownBy(read)
        .isInstanceOf(SearchUnavailableException.class)
        .hasMessage("Search is unavailable")
        .hasNoCause();
  }
}
