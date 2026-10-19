package com.blockout.backend.collection.api;

import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.service.SourcePreparationService;
import com.blockout.backend.generated.mobile.api.CollectionSourcesApi;
import com.blockout.backend.generated.mobile.model.CollectionSeasonListResponse;
import com.blockout.backend.generated.mobile.model.CollectionSeasonResponse;
import com.blockout.backend.generated.mobile.model.ConfirmSourceSeasonRequest;
import com.blockout.backend.generated.mobile.model.CreateSourceBindingRequest;
import com.blockout.backend.generated.mobile.model.DiscoveredCollectionResourcePageResponse;
import com.blockout.backend.generated.mobile.model.LaunchCollectionSourcesRequest;
import com.blockout.backend.generated.mobile.model.RequestSourceValidationRequest;
import com.blockout.backend.generated.mobile.model.SetSourceCandidateRequest;
import com.blockout.backend.generated.mobile.model.SourceBindingListResponse;
import com.blockout.backend.generated.mobile.model.SourceBindingResponse;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Generated preparation routes; current grants and atomic state changes belong to the service. */
@RestController
@RequiredArgsConstructor
public class CollectionSourcesController implements CollectionSourcesApi {
  private final SourcePreparationService preparation;
  private final CurrentAccount account;
  private final CollectionApiMapper mapper;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<CollectionSeasonListResponse> listCollectionSeasons() {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            new CollectionSeasonListResponse(
                preparation.seasons(account.id()).stream().map(mapper::toDto).toList()));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<CollectionSeasonResponse> getCollectionSeason(UUID seasonId) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(preparation.season(account.id(), seasonId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<SourceBindingListResponse> listCollectionSources(UUID seasonId) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            new SourceBindingListResponse(
                preparation.list(account.id(), seasonId).stream().map(mapper::toDto).toList()));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<SourceBindingResponse> getCollectionSource(UUID sourceBindingId) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(preparation.get(account.id(), sourceBindingId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<SourceBindingResponse> createCollectionSource(
      UUID seasonId, CreateSourceBindingRequest request) {
    Source created =
        preparation.create(
            account.id(),
            seasonId,
            request.getSeasonRevision(),
            mapper.toProvider(request.getProvider()),
            request.getOrganizerReference(),
            request.getCandidateUrl());
    return ResponseEntity.created(URI.create("/administration/source-bindings/" + created.id()))
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(created));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<SourceBindingResponse> setCollectionSourceCandidate(
      UUID sourceBindingId, SetSourceCandidateRequest request) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            mapper.toDto(
                preparation.setCandidate(
                    account.id(),
                    sourceBindingId,
                    request.getRevision(),
                    request.getCandidateUrl())));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<SourceBindingResponse> requestCollectionSourceValidation(
      UUID sourceBindingId, RequestSourceValidationRequest request) {
    return ResponseEntity.accepted()
        .cacheControl(CacheControl.noStore())
        .body(
            mapper.toDto(
                preparation.requestValidation(
                    account.id(), sourceBindingId, request.getRevision())));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<SourceBindingResponse> confirmCollectionSourceSeason(
      UUID sourceBindingId, ConfirmSourceSeasonRequest request) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            mapper.toDto(
                preparation.confirmSeason(
                    account.id(),
                    sourceBindingId,
                    request.getRevision(),
                    request.getSeasonLabel())));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<CollectionSeasonResponse> launchCollectionSources(
      UUID seasonId, LaunchCollectionSourcesRequest request) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            mapper.toDto(
                preparation.launch(
                    account.id(), seasonId, request.getRevision(), request.getSourceBindingIds())));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<DiscoveredCollectionResourcePageResponse> listCollectionSourceChildren(
      UUID sourceBindingId, UUID parentId, Long page, Integer size) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            mapper.toDto(
                preparation.children(account.id(), sourceBindingId, parentId, page, size)));
  }
}
