package com.blockout.backend.sporting.api;

import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.generated.mobile.api.SportingClassificationApi;
import com.blockout.backend.generated.mobile.model.ClassificationDetailResponse;
import com.blockout.backend.generated.mobile.model.SetClassificationRequest;
import com.blockout.backend.sporting.application.service.ChangeSportingClassification;
import com.blockout.backend.sporting.application.service.ReadSportingConfiguration;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Generated pack/pool routes backed by atomic owner commands and current local grants. */
@RestController
@RequiredArgsConstructor
public class SportingClassificationController implements SportingClassificationApi {
  private final ChangeSportingClassification classifications;
  private final ReadSportingConfiguration configurationReads;
  private final CurrentAccount account;
  private final SportingAdministrationMapper mapper;

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
                    account.id(),
                    packId,
                    request.getRevision(),
                    mapper.toCommand(request.getClassification().get()))));
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
                    account.id(),
                    poolId,
                    request.getRevision(),
                    mapper.toCommand(request.getClassification().get()))));
  }
}
