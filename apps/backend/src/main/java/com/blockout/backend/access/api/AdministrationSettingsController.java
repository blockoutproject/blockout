package com.blockout.backend.access.api;

import com.blockout.backend.access.application.ReadAccessConfiguration;
import com.blockout.backend.access.application.UpdateAccessSettings;
import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.generated.mobile.api.ApplicationAccessApi;
import com.blockout.backend.generated.mobile.model.ApplicationAccessResponse;
import com.blockout.backend.generated.mobile.model.ApplicationVersionsResponse;
import com.blockout.backend.generated.mobile.model.ChangeApplicationVersionsRequest;
import com.blockout.backend.generated.mobile.model.ChangeMaintenanceRequest;
import com.blockout.backend.generated.mobile.model.MaintenanceSettingsResponse;
import com.blockout.backend.generated.mobile.model.SetMaintenanceActivationRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/**
 * Single implementation of the generated interface, including its identity-independent public read.
 */
@RestController
@RequiredArgsConstructor
public class AdministrationSettingsController implements ApplicationAccessApi {
  private final ReadAccessConfiguration reads;
  private final UpdateAccessSettings updates;
  private final CurrentAccount account;
  private final AccessApiMapper mapper;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ApplicationAccessResponse> getApplicationAccess() {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(reads.read()));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<MaintenanceSettingsResponse> getMaintenanceSettings() {
    return patchable().body(mapper.toDto(reads.maintenance(account.id())));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ApplicationVersionsResponse> getApplicationVersionSettings() {
    return patchable().body(mapper.toDto(reads.versions(account.id())));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<MaintenanceSettingsResponse> changeMaintenanceSettings(
      ChangeMaintenanceRequest request) {
    return patchable()
        .body(mapper.toDto(updates.changeMaintenance(account.id(), mapper.toCommand(request))));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<MaintenanceSettingsResponse> setMaintenanceActivation(
      SetMaintenanceActivationRequest request) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            mapper.toDto(
                updates.activate(account.id(), request.getRevision(), request.getActive())));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ApplicationVersionsResponse> changeApplicationVersionSettings(
      ChangeApplicationVersionsRequest request) {
    return patchable()
        .body(mapper.toDto(updates.changeVersions(account.id(), mapper.toCommand(request))));
  }

  /** Advertises only the authored application/json partial-change semantics. */
  private static ResponseEntity.BodyBuilder patchable() {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .header("Accept-Patch", "application/json");
  }
}
