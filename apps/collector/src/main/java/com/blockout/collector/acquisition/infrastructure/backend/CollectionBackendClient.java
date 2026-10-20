package com.blockout.collector.acquisition.infrastructure.backend;

import com.blockout.collector.acquisition.application.CollectionBackend;
import com.blockout.collector.generated.ingestion.api.CollectorOperationsApi;
import com.blockout.collector.generated.ingestion.model.CompleteCollectionCycleInternalRequest;
import com.blockout.collector.generated.ingestion.model.RegisterCollectorRuntimeInternalRequest;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Native generated backend adapter; the existing ApiClient owns OAuth, decoding and no-retry HTTP.
 */
@Component
@RequiredArgsConstructor
public class CollectionBackendClient implements CollectionBackend {
  private final CollectorOperationsApi api;
  private final CollectionBackendMapper mapper;

  /** {@inheritDoc} */
  @Override
  public Runtime current() {
    return BackendExchange.once(() -> mapper.toView(api.getCollectorRuntime()));
  }

  /** {@inheritDoc} */
  @Override
  public Runtime register(long revision, UUID incarnationId) {
    return BackendExchange.once(
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
    return BackendExchange.once(
        () -> mapper.toView(api.startCollectionCycle(mapper.toRequest(command))));
  }

  /** {@inheritDoc} */
  @Override
  public Cycle cycle(UUID id) {
    return BackendExchange.once(() -> mapper.toView(api.getCollectionCycle(id)));
  }

  /** {@inheritDoc} */
  @Override
  public TargetPage targets(UUID cycleId, long page) {
    return BackendExchange.once(
        () -> mapper.toView(api.listCollectionCycleTargets(cycleId, page, 50)));
  }

  /** {@inheritDoc} */
  @Override
  public Cycle record(UUID cycleId, Result result) {
    return BackendExchange.once(
        () -> mapper.toView(api.recordCollectionResult(cycleId, mapper.toRequest(result))));
  }

  /** {@inheritDoc} */
  @Override
  public Cycle complete(UUID cycleId, Instant completedAt) {
    return BackendExchange.once(
        () ->
            mapper.toView(
                api.completeCollectionCycle(
                    cycleId,
                    new CompleteCollectionCycleInternalRequest()
                        .completedAt(mapper.toDate(completedAt)))));
  }

  /** {@inheritDoc} */
  @Override
  public void validate(UUID sourceBindingId, Validation result) {
    BackendExchange.once(
        () -> api.submitCollectionSourceValidation(sourceBindingId, mapper.toRequest(result)));
  }
}
