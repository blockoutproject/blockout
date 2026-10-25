package com.blockout.backend.sporting.api;

import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.generated.mobile.api.SportingPresentationApi;
import com.blockout.backend.generated.mobile.model.ClubContactsResponse;
import com.blockout.backend.generated.mobile.model.DivisionResponse;
import com.blockout.backend.generated.mobile.model.PoolPresentationResponse;
import com.blockout.backend.generated.mobile.model.SetClubContactsRequest;
import com.blockout.backend.generated.mobile.model.SetClubPresentationRequest;
import com.blockout.backend.generated.mobile.model.SetDivisionPresentationRequest;
import com.blockout.backend.generated.mobile.model.SetPoolPresentationRequest;
import com.blockout.backend.generated.mobile.model.SetTeamPresentationRequest;
import com.blockout.backend.generated.mobile.model.SportingPresentationResponse;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Kind;
import com.blockout.backend.sporting.application.model.SportingPresentation.Image;
import com.blockout.backend.sporting.application.service.ChangeClubContacts;
import com.blockout.backend.sporting.application.service.ChangeSportingPresentation;
import com.blockout.backend.sporting.application.service.ReadSportingConfiguration;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Canonical generated atomic editors; decoding finishes before the short owner transaction. */
@RestController
@RequiredArgsConstructor
public class SportingPresentationController implements SportingPresentationApi {
  private final ChangeSportingPresentation presentation;
  private final ReadSportingConfiguration configurationReads;
  private final ChangeClubContacts contacts;

  private final CurrentAccount account;
  private final SportingPresentationValidator imageParts;
  private final CurrentPermissions permissions;
  private final SportingPresentationMapper mapper;
  private final SportingAdministrationMapper administrationMapper;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<SportingPresentationResponse> getClubPresentation(UUID clubId) {
    return response(
        mapper.toDto(configurationReads.presentation(account.id(), Kind.CLUB, clubId)),
        "multipart/form-data");
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<SportingPresentationResponse> getTeamPresentation(UUID teamId) {
    return response(
        mapper.toDto(configurationReads.presentation(account.id(), Kind.TEAM, teamId)),
        "multipart/form-data");
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<PoolPresentationResponse> getPoolPresentation(UUID poolId) {
    return response(
        mapper.toPoolDto(configurationReads.presentation(account.id(), Kind.POOL, poolId)), null);
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<SportingPresentationResponse> setClubPresentation(
      UUID clubId, SetClubPresentationRequest metadata, MultipartFile image) {
    UUID accountId = account.id();
    permissions.requireForRead(accountId, Permission.MANAGE_SPORTING_PRESENTATION);
    Image validated = imageParts.validateImage(metadata.getLogoAction(), image);
    return response(
        mapper.toDto(
            presentation.set(accountId, Kind.CLUB, clubId, mapper.toCommand(metadata, validated))),
        "multipart/form-data");
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<SportingPresentationResponse> setTeamPresentation(
      UUID teamId, SetTeamPresentationRequest metadata, MultipartFile image) {
    UUID accountId = account.id();
    permissions.requireForRead(accountId, Permission.MANAGE_SPORTING_PRESENTATION);
    Image validated = imageParts.validateImage(metadata.getLogoAction(), image);
    return response(
        mapper.toDto(
            presentation.set(accountId, Kind.TEAM, teamId, mapper.toCommand(metadata, validated))),
        "multipart/form-data");
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<PoolPresentationResponse> setPoolPresentation(
      UUID poolId, SetPoolPresentationRequest request) {
    return response(
        mapper.toPoolDto(
            presentation.set(account.id(), Kind.POOL, poolId, mapper.toCommand(request))),
        null);
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<DivisionResponse> setDivisionPresentation(
      UUID divisionId, SetDivisionPresentationRequest metadata, MultipartFile image) {
    UUID accountId = account.id();
    permissions.requireForRead(accountId, Permission.MANAGE_SPORTING_PRESENTATION);
    Image validated = imageParts.validateImage(metadata.getLogoAction(), image);
    return response(
        administrationMapper.toDto(
            presentation.setDivision(accountId, divisionId, mapper.toCommand(metadata, validated))),
        "multipart/form-data");
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ClubContactsResponse> getClubContacts(UUID clubId) {
    return response(
        mapper.toDto(configurationReads.clubContacts(account.id(), clubId)), "application/json");
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ClubContactsResponse> setClubContacts(
      UUID clubId, SetClubContactsRequest request) {
    return response(
        mapper.toDto(
            contacts.correct(
                account.id(), clubId, request.getRevision(), mapper.toContactCommands(request))),
        "application/json");
  }

  /**
   * Keeps administrative values uncached and advertises the actual patch format when applicable.
   *
   * @param body generated current representation
   * @param patchType supported patch media type, or null for a PUT-only resource
   * @return successful canonical response
   */
  private <T> ResponseEntity<T> response(T body, String patchType) {
    ResponseEntity.BodyBuilder response = ResponseEntity.ok().cacheControl(CacheControl.noStore());
    if (patchType != null) response.header("Accept-Patch", patchType);
    return response.body(body);
  }
}
