package com.blockout.backend.collection.api;

import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.service.PrepareCollectionSources;
import com.blockout.backend.collection.application.service.ReadCollectionConfiguration;
import com.blockout.backend.generated.mobile.api.CollectionSourcesApi;
import com.blockout.backend.generated.mobile.model.CollectionSeasonListResponse;
import com.blockout.backend.generated.mobile.model.CollectionSeasonResponse;
import com.blockout.backend.generated.mobile.model.ConfirmSourceSeasonRequest;
import com.blockout.backend.generated.mobile.model.CreateSourceBindingRequest;
import com.blockout.backend.generated.mobile.model.DiscoveredCollectionResourcePageResponse;
import com.blockout.backend.generated.mobile.model.LaunchCollectionSourcesRequest;
import com.blockout.backend.generated.mobile.model.SetSourceCandidateRequest;
import com.blockout.backend.generated.mobile.model.SourceBindingListResponse;
import com.blockout.backend.generated.mobile.model.SourceBindingResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Read-only catalogue routes and season activation through the current collection grant. */
@RestController
@RequiredArgsConstructor
public class CollectionSourcesController implements CollectionSourcesApi {
  private final PrepareCollectionSources preparation;
  private final ReadCollectionConfiguration configurationReads;
  private final CurrentAccount account;
  private final CurrentPermissions permissions;
  private final CollectionApiMapper mapper;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<CollectionSeasonListResponse> listCollectionSeasons() {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toSeasonsDto(configurationReads.seasons(account.id())));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<CollectionSeasonResponse> getCollectionSeason(UUID seasonId) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(configurationReads.season(account.id(), seasonId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<SourceBindingListResponse> listCollectionSources(UUID seasonId) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toSourcesDto(configurationReads.sourceCatalogs(account.id(), seasonId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<SourceBindingResponse> getCollectionSource(UUID sourceBindingId) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(configurationReads.sourceCatalog(account.id(), sourceBindingId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<CollectionSeasonResponse> activateCollectionSeason(UUID seasonId) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(preparation.activate(account.id(), seasonId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<SourceBindingResponse> createCollectionSource(
      UUID seasonId, CreateSourceBindingRequest request) {
    throw retiredSourceWrite();
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<SourceBindingResponse> setCollectionSourceCandidate(
      UUID sourceBindingId, SetSourceCandidateRequest request) {
    throw retiredSourceWrite();
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<SourceBindingResponse> requestCollectionSourceValidation(
      UUID sourceBindingId) {
    throw retiredSourceWrite();
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<SourceBindingResponse> confirmCollectionSourceSeason(
      UUID sourceBindingId, ConfirmSourceSeasonRequest request) {
    throw retiredSourceWrite();
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<CollectionSeasonResponse> launchCollectionSources(
      UUID seasonId, LaunchCollectionSourcesRequest request) {
    throw retiredSourceWrite();
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<DiscoveredCollectionResourcePageResponse> listCollectionSourceChildren(
      UUID sourceBindingId, UUID parentId, Long page, Integer size) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            mapper.toDto(
                configurationReads.children(account.id(), sourceBindingId, parentId, page, size)));
  }

  /**
   * Older clients receive ordinary conflict feedback without changing the scope of their action.
   */
  private CollectionConflictException retiredSourceWrite() {
    permissions.requireForRead(account.id(), Permission.MANAGE_COLLECTION);
    return new CollectionConflictException("conflict");
  }
}
