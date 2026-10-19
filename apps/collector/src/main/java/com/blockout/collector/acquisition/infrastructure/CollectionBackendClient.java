package com.blockout.collector.acquisition.infrastructure;

import com.blockout.collector.acquisition.application.CollectionBackend;
import com.blockout.collector.acquisition.application.CollectionBackendFailure;
import com.blockout.collector.generated.ingestion.api.CollectorOperationsApi;
import com.blockout.collector.generated.ingestion.model.RegisterCollectorRuntimeInternalRequest;
import java.util.UUID;
import java.util.function.Supplier;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/**
 * Native generated backend adapter; the existing ApiClient owns OAuth, validation and no-retry
 * HTTP.
 */
@Component
@RequiredArgsConstructor
public class CollectionBackendClient implements CollectionBackend {
  private final CollectorOperationsApi api;
  private final CollectionBackendMapper mapper;

  /** {@inheritDoc} */
  @Override
  public Runtime current() {
    return exchange(() -> mapper.toView(api.getCollectorRuntime()));
  }

  /** {@inheritDoc} */
  @Override
  public Runtime register(long revision, UUID incarnationId) {
    return exchange(
        () ->
            mapper.toView(
                api.registerCollectorRuntime(
                    new RegisterCollectorRuntimeInternalRequest()
                        .revision(revision)
                        .incarnationId(incarnationId))));
  }

  /** {@inheritDoc} */
  @Override
  public Cycle admit(StartCycle command) {
    return exchange(() -> mapper.toView(api.startCollectionCycle(mapper.toRequest(command))));
  }

  /** {@inheritDoc} */
  @Override
  public Cycle cycle(UUID id) {
    return exchange(() -> mapper.toView(api.getCollectionCycle(id)));
  }

  /**
   * Classifies one HTTP failure for confirmation reads, never mutation retries.
   *
   * @param operation one generated HTTP exchange, executed exactly once
   * @param <T> already mapped application result
   * @return accepted result, with failure classification for confirmation reads only
   */
  private <T> T exchange(Supplier<T> operation) {
    try {
      return operation.get();
    } catch (RestClientResponseException failure) {
      CollectionBackendFailure.Kind kind =
          switch (failure.getStatusCode().value()) {
            case 409 -> CollectionBackendFailure.Kind.CONFLICT;
            case 404 -> CollectionBackendFailure.Kind.NOT_FOUND;
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
