package com.blockout.collector.acquisition.infrastructure.backend;

import com.blockout.collector.acquisition.application.CollectionBackendFailure;
import java.util.function.Supplier;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/**
 * Shared classification for generated backend exchanges; this boundary never retries a mutation.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
final class BackendExchange {
  /**
   * Classifies one native HTTP/decoding failure without disclosing its response payload.
   *
   * @param operation single generated exchange
   * @param <T> mapped application result
   * @return accepted result, or classified uncertainty for the application owner
   */
  static <T> T once(Supplier<T> operation) {
    try {
      return operation.get();
    } catch (RestClientResponseException failure) {
      CollectionBackendFailure.Kind kind =
          switch (failure.getStatusCode().value()) {
            case 409 -> CollectionBackendFailure.Kind.CONFLICT;
            default ->
                failure.getStatusCode().is5xxServerError()
                    ? CollectionBackendFailure.Kind.UNCONFIRMED
                    : CollectionBackendFailure.Kind.REJECTED;
          };
      throw new CollectionBackendFailure(kind, failure);
    } catch (RestClientException failure) {
      throw new CollectionBackendFailure(CollectionBackendFailure.Kind.UNCONFIRMED, failure);
    }
  }
}
