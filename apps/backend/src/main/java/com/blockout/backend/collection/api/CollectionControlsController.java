package com.blockout.backend.collection.api;

import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.collection.application.service.ChangeCollectionControls;
import com.blockout.backend.collection.application.service.ChangeCollectionControls.RequestOutcome;
import com.blockout.backend.collection.application.service.CloseCollectionSeason;
import com.blockout.backend.collection.application.service.ReadCollectionConfiguration;
import com.blockout.backend.generated.mobile.api.CollectionApi;
import com.blockout.backend.generated.mobile.model.CloseCollectionSeasonRequest;
import com.blockout.backend.generated.mobile.model.CollectionControlListResponse;
import com.blockout.backend.generated.mobile.model.CollectionControlResponse;
import com.blockout.backend.generated.mobile.model.CollectionSeasonResponse;
import com.blockout.backend.generated.mobile.model.RequestCollectionRequest;
import com.blockout.backend.generated.mobile.model.SetCollectionActivityRequest;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/**
 * Generated operator controls; current grants and atomic intent changes belong to their use cases.
 */
@RestController
@RequiredArgsConstructor
public class CollectionControlsController implements CollectionApi {
  private final ChangeCollectionControls controls;
  private final ReadCollectionConfiguration configurationReads;
  private final CloseCollectionSeason closure;
  private final CurrentAccount account;
  private final CollectionApiMapper mapper;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<CollectionControlListResponse> listCollectionControls(UUID seasonId) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toControlsDto(configurationReads.controls(account.id(), seasonId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<CollectionControlResponse> getCollectionControl(UUID controlId) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(configurationReads.control(account.id(), controlId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<CollectionControlResponse> setCollectionActivity(
      UUID controlId, SetCollectionActivityRequest request) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            mapper.toDto(
                controls.setActivity(
                    account.id(), controlId, request.getRevision(), request.getEnabled())));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<CollectionControlResponse> requestCollection(
      UUID controlId, RequestCollectionRequest request) {
    RequestOutcome outcome = controls.request(account.id(), controlId, request.getRevision());
    ResponseEntity.BodyBuilder response =
        outcome.running() ? ResponseEntity.ok() : ResponseEntity.accepted();
    return response.cacheControl(CacheControl.noStore()).body(mapper.toDto(outcome.view()));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<CollectionSeasonResponse> closeCollectionSeason(
      UUID seasonId, CloseCollectionSeasonRequest request) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            mapper.toDto(
                closure.close(
                    account.id(), seasonId, request.getRevision(), request.getConfirmation())));
  }
}
