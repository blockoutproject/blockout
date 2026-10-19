package com.blockout.backend.collection.api;

import com.blockout.backend.collection.application.CollectionCycleService;
import com.blockout.backend.collection.application.CollectionState.Admission;
import com.blockout.backend.collection.application.CollectorRuntimeService;
import com.blockout.backend.generated.ingestion.api.CollectorOperationsApi;
import com.blockout.backend.generated.ingestion.model.CollectionCycleInternalResponse;
import com.blockout.backend.generated.ingestion.model.CollectionTargetPageInternalResponse;
import com.blockout.backend.generated.ingestion.model.CollectionWorkInternalResponse;
import com.blockout.backend.generated.ingestion.model.CollectorRuntimeInternalResponse;
import com.blockout.backend.generated.ingestion.model.RegisterCollectorRuntimeInternalRequest;
import com.blockout.backend.generated.ingestion.model.StartCollectionCycleInternalRequest;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Generated collector entrypoints behind the existing dedicated M2M security chain. */
@RestController
@RequiredArgsConstructor
public class CollectorOperationsController implements CollectorOperationsApi {
  private final CollectorRuntimeService runtimes;
  private final CollectionCycleService cycles;
  private final CollectionApiMapper mapper;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<CollectorRuntimeInternalResponse> getCollectorRuntime() {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(runtimes.current()));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<CollectorRuntimeInternalResponse> registerCollectorRuntime(
      RegisterCollectorRuntimeInternalRequest request) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(runtimes.register(request.getRevision(), request.getIncarnationId())));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<CollectionWorkInternalResponse> getCollectionWork(UUID incarnationId) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(cycles.work(incarnationId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<CollectionCycleInternalResponse> startCollectionCycle(
      StartCollectionCycleInternalRequest request) {
    Admission admission = cycles.admit(mapper.toCommand(request));
    ResponseEntity.BodyBuilder response =
        admission.created()
            ? ResponseEntity.created(
                URI.create("/ingestion/collection-cycles/" + admission.cycle().id()))
            : ResponseEntity.ok();
    return response.cacheControl(CacheControl.noStore()).body(mapper.toDto(admission.cycle()));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<CollectionCycleInternalResponse> getCollectionCycle(UUID cycleId) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(cycles.get(cycleId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<CollectionTargetPageInternalResponse> listCollectionCycleTargets(
      UUID cycleId, Long page, Integer size) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(cycles.targets(cycleId, page, size)));
  }
}
