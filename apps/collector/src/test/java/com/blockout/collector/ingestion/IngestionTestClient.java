package com.blockout.collector.ingestion;

import com.blockout.collector.generated.ingestion.ApiClient;
import io.micrometer.observation.ObservationRegistry;
import java.time.Duration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;

/**
 * Actual configured generated transport for controlled HTTP tests; OAuth has its own real suite.
 */
public record IngestionTestClient(ApiClient api, HttpComponentsClientHttpRequestFactory factory)
    implements AutoCloseable {
  /**
   * Creates the production converters, timeout and no-retry transport against a local peer.
   *
   * @param baseUrl controlled listener
   * @return owned native client and connection pool
   */
  public static IngestionTestClient connect(String baseUrl) {
    IngestionClientConfiguration configuration = new IngestionClientConfiguration();
    IngestionProperties properties =
        new IngestionProperties(baseUrl, "ingestion-test", Duration.ofSeconds(2));
    HttpComponentsClientHttpRequestFactory factory =
        configuration.ingestionRequestFactory(properties);
    ApiClient client =
        configuration.ingestionApiClient(
            factory,
            ObservationRegistry.NOOP,
            properties,
            (request, body, execution) -> execution.execute(request, body));
    client.setBearerToken("harmless-test-token");
    return new IngestionTestClient(client, factory);
  }

  /** Releases the native pool after each scenario. */
  @Override
  public void close() throws Exception {
    factory.destroy();
  }
}
