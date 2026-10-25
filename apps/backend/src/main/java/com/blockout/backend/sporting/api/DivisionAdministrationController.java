package com.blockout.backend.sporting.api;

import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.generated.mobile.api.DivisionAdministrationApi;
import com.blockout.backend.generated.mobile.model.CreateDivisionRequest;
import com.blockout.backend.generated.mobile.model.DivisionListResponse;
import com.blockout.backend.generated.mobile.model.DivisionResponse;
import com.blockout.backend.generated.mobile.model.SetDivisionActivityRequest;
import com.blockout.backend.sporting.application.model.SportingPresentation.DivisionDefinition;
import com.blockout.backend.sporting.application.model.SportingPresentation.Image;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
import com.blockout.backend.sporting.application.service.ChangeDivisionLifecycle;
import com.blockout.backend.sporting.application.service.ReadSportingConfiguration;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Generated administrative division routes; public image delivery has its own access boundary. */
@RestController
@RequiredArgsConstructor
public class DivisionAdministrationController implements DivisionAdministrationApi {
  private final ChangeDivisionLifecycle divisions;
  private final ReadSportingConfiguration configurationReads;
  private final CurrentAccount account;
  private final SportingPresentationValidator imageParts;
  private final CurrentPermissions permissions;
  private final SportingAdministrationMapper mapper;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<DivisionListResponse> listDivisions(Boolean includeInactive) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            mapper.toDto(
                configurationReads.divisions(account.id(), Boolean.TRUE.equals(includeInactive))));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<DivisionResponse> getDivision(UUID divisionId) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(configurationReads.division(account.id(), divisionId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<DivisionResponse> createDivision(
      CreateDivisionRequest metadata, MultipartFile image) {
    UUID accountId = account.id();
    permissions.requireForRead(accountId, Permission.MANAGE_DIVISION_LIFECYCLE);
    DivisionDefinition definition = mapper.toCommand(metadata);
    Image validated = imageParts.validateImage(metadata.getLogoAction(), image);
    DivisionDetail created = divisions.create(accountId, definition, validated);
    return ResponseEntity.created(URI.create("/administration/divisions/" + created.id()))
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(created));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<DivisionResponse> setDivisionActivity(
      UUID divisionId, SetDivisionActivityRequest request) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            mapper.toDto(
                divisions.setActive(
                    account.id(), divisionId, request.getRevision(), request.getActive())));
  }
}
