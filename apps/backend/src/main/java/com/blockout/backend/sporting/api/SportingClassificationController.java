package com.blockout.backend.sporting.api;

import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.generated.mobile.api.SportingClassificationApi;
import com.blockout.backend.generated.mobile.model.ClassificationDetailResponse;
import com.blockout.backend.generated.mobile.model.MappingFilterDimensionEnum;
import com.blockout.backend.generated.mobile.model.MappingFilterOptionPageResponse;
import com.blockout.backend.generated.mobile.model.MappingPackDetailResponse;
import com.blockout.backend.generated.mobile.model.MappingPackPageResponse;
import com.blockout.backend.generated.mobile.model.MappingStatusEnum;
import com.blockout.backend.generated.mobile.model.SetClassificationRequest;
import com.blockout.backend.sporting.application.model.SportingMapping.MappingPackFilters;
import com.blockout.backend.sporting.application.service.ChangeSportingClassification;
import com.blockout.backend.sporting.application.service.ReadSportingConfiguration;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Pack and pool mapping and atomic corrections under current sporting-classification grants. */
@RestController
@RequiredArgsConstructor
public class SportingClassificationController implements SportingClassificationApi {
  private final ChangeSportingClassification classifications;
  private final ReadSportingConfiguration configurationReads;
  private final CurrentAccount account;
  private final SportingAdministrationMapper mapper;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<MappingPackPageResponse> listMappingPacks(
      String search,
      MappingStatusEnum status,
      UUID sourceId,
      UUID seasonId,
      Long page,
      Integer size) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            mapper.toPackPage(
                configurationReads.mappingPacks(
                    account.id(),
                    new MappingPackFilters(search, status, sourceId, seasonId),
                    page,
                    size)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<MappingPackDetailResponse> getMappingPack(
      UUID packId, Long page, Integer size) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(configurationReads.mappingPack(account.id(), packId, page, size)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<MappingFilterOptionPageResponse> listMappingFilterOptions(
      MappingFilterDimensionEnum dimension, Long page, Integer size) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            mapper.toFilterOptions(
                configurationReads.mappingFilterOptions(account.id(), dimension, page, size)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ClassificationDetailResponse> getPackClassification(UUID packId) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(configurationReads.pack(account.id(), packId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ClassificationDetailResponse> getPoolClassification(UUID poolId) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(configurationReads.pool(account.id(), poolId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ClassificationDetailResponse> setPackClassification(
      UUID packId, SetClassificationRequest request) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            mapper.toDto(
                classifications.setPack(
                    account.id(), packId, mapper.toCommand(request.getClassification().get()))));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ClassificationDetailResponse> setPoolClassification(
      UUID poolId, SetClassificationRequest request) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            mapper.toDto(
                classifications.setPool(
                    account.id(), poolId, mapper.toCommand(request.getClassification().get()))));
  }
}
