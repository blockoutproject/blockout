package com.blockout.collector.acquisition.infrastructure.backend;

import com.blockout.collector.acquisition.application.CollectionBackend;
import com.blockout.collector.generated.ingestion.api.CollectionApi;
import com.blockout.collector.generated.ingestion.api.CollectorOperationsApi;
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
  private final CollectionApi sources;

  /** {@inheritDoc} */
  @Override
  public Work work(UUID incarnationId) {
    return BackendExchange.once(() -> mapper.toView(api.getCollectionWork(incarnationId)));
  }

  /** {@inheritDoc} */
  @Override
  public void observeSource(SourceProposal proposal) {
    BackendExchange.once(() -> sources.observeCollectionSeasonSource(mapper.toDto(proposal)));
  }

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
        () -> mapper.toView(api.registerCollectorRuntime(mapper.toDto(revision, incarnationId))));
  }

  /** {@inheritDoc} */
  @Override
  public Cycle admit(StartCycle command) {
    return BackendExchange.once(
        () -> mapper.toView(api.startCollectionCycle(mapper.toDto(command))));
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
        () -> mapper.toView(api.recordCollectionResult(cycleId, mapper.toDto(result))));
  }

  /** {@inheritDoc} */
  @Override
  public Cycle complete(UUID cycleId, Instant completedAt) {
    return BackendExchange.once(
        () -> mapper.toView(api.completeCollectionCycle(cycleId, mapper.toDto(completedAt))));
  }

  /** {@inheritDoc} */
  @Override
  public void validate(UUID sourceBindingId, Validation result) {
    BackendExchange.once(
        () -> api.submitCollectionSourceValidation(sourceBindingId, mapper.toDto(result)));
  }
}
