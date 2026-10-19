package com.blockout.backend.sporting.api;

import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.generated.mobile.api.DivisionAdministrationApi;
import com.blockout.backend.generated.mobile.model.CreateDivisionRequest;
import com.blockout.backend.generated.mobile.model.DivisionListResponse;
import com.blockout.backend.generated.mobile.model.DivisionResponse;
import com.blockout.backend.generated.mobile.model.LogoActionEnum;
import com.blockout.backend.generated.mobile.model.SetDivisionActivityRequest;
import com.blockout.backend.shared.image.ImageValidator;
import com.blockout.backend.shared.image.ImageValidator.ValidatedImage;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
import com.blockout.backend.sporting.application.service.DivisionService;
import java.io.IOException;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/** Generated administrative division routes; public image delivery has its own access boundary. */
@RestController
@RequiredArgsConstructor
public class DivisionAdministrationController implements DivisionAdministrationApi {
  private final DivisionService divisions;
  private final CurrentAccount account;
  private final SportingAdministrationMapper mapper;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<DivisionListResponse> listDivisions(Boolean includeInactive) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            new DivisionListResponse(
                divisions.list(account.id(), Boolean.TRUE.equals(includeInactive)).stream()
                    .map(mapper::toResponse)
                    .toList()));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<DivisionResponse> getDivision(UUID divisionId) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toResponse(divisions.get(account.id(), divisionId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<DivisionResponse> createDivision(
      CreateDivisionRequest metadata, MultipartFile image) {
    UUID accountId = account.id();
    divisions.requireLifecycle(accountId);
    if (metadata.getName().isBlank())
      throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
    ValidatedImage validated = validateLogo(metadata.getLogoAction(), image);
    DivisionDetail created =
        divisions.create(
            accountId,
            metadata.getName(),
            metadata.getColor(),
            metadata.getGradient().get(),
            validated == null ? null : validated.bytes(),
            validated == null ? null : validated.mediaType());
    return ResponseEntity.created(URI.create("/administration/divisions/" + created.id()))
        .cacheControl(CacheControl.noStore())
        .body(mapper.toResponse(created));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<DivisionResponse> setDivisionActivity(
      UUID divisionId, SetDivisionActivityRequest request) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            mapper.toResponse(
                divisions.setActive(
                    account.id(), divisionId, request.getRevision(), request.getActive())));
  }

  /**
   * Checks the logo instruction and validates bounded replacement content after permission
   * preflight and before opening a write transaction.
   *
   * @param action desired logo handling from validated metadata
   * @param image optional multipart bytes, independent from claimed content type
   * @return validated original bytes and detected type, or null
   * @throws ResponseStatusException for inconsistent parts or unsupported content
   */
  private ValidatedImage validateLogo(LogoActionEnum action, MultipartFile image) {
    if (action != LogoActionEnum.REPLACE) {
      if (image != null) throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
      return null;
    }
    if (image == null || image.isEmpty())
      throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
    try {
      return ImageValidator.validate(image.getBytes());
    } catch (IOException invalid) {
      throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
    }
  }
}
