package com.blockout.backend.search.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.blockout.backend.search.application.SearchContext;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.opensearch.client.opensearch.OpenSearchClient;
import org.opensearch.client.opensearch.core.SearchRequest;
import org.opensearch.client.opensearch.core.SearchResponse;

/** Captured native requests qualify resource aliases in the configured environment namespace. */
@DisplayName("Native search resource aliases")
class OpenSearchEngineTest {
  @ParameterizedTest
  @CsvSource({"CLUB,clubs", "TEAM,teams", "POOL,pools"})
  @DisplayName("Queries the resource alias in the configured environment namespace")
  void selectsResourceAlias(SearchContext.Resource resource, String suffix) throws Exception {
    // Given
    OpenSearchClient client = mock(OpenSearchClient.class);
    SearchResponse<OpenSearchEngine.IndexedCity> response =
        new SearchResponse.Builder<OpenSearchEngine.IndexedCity>()
            .took(1)
            .timedOut(false)
            .shards(shards -> shards.total(1).successful(1).failed(0))
            .hits(hits -> hits.hits(List.of()))
            .build();
    when(client.search(any(SearchRequest.class), eq(OpenSearchEngine.IndexedCity.class)))
        .thenReturn(response);
    OpenSearchEngine engine =
        new OpenSearchEngine(client, new SearchIndexProperties("isolated-search"));
    SearchContext context = new SearchContext(resource, "eagles", null, null, null, null, false);

    // When
    engine.search(context, null, 20);

    // Then
    ArgumentCaptor<SearchRequest> request = ArgumentCaptor.forClass(SearchRequest.class);
    verify(client).search(request.capture(), eq(OpenSearchEngine.IndexedCity.class));
    assertThat(request.getValue().index()).containsExactly("isolated-search-" + suffix);
  }
}
