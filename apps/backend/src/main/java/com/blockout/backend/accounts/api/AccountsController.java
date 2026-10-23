package com.blockout.backend.accounts.api;

import com.blockout.backend.access.api.MaintenanceBypass;
import com.blockout.backend.accounts.application.AccountAdmission;
import com.blockout.backend.accounts.application.ChangeAccountProfile;
import com.blockout.backend.accounts.application.EstablishAccount;
import com.blockout.backend.accounts.application.ProfilePhoto;
import com.blockout.backend.accounts.application.ReadAccount;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import com.blockout.backend.accounts.application.exception.InvalidProfileChangeException;
import com.blockout.backend.accounts.application.exception.InvalidProfilePhotoException;
import com.blockout.backend.accounts.infrastructure.ProfilePhotoProcessor;
import com.blockout.backend.generated.mobile.api.AccountsApi;
import com.blockout.backend.generated.mobile.model.AccountResponse;
import com.blockout.backend.generated.mobile.model.ChangeAccountProfileRequest;
import com.blockout.backend.generated.mobile.model.ProfilePhotoActionEnum;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.Part;
import java.io.IOException;
import java.net.URI;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Generated account adapter; validated credentials supply identity, never request fields. */
@RestController
@RequiredArgsConstructor
public class AccountsController implements AccountsApi {
  private final EstablishAccount establishment;
  private final ReadAccount reads;
  private final ChangeAccountProfile changes;
  private final ProfilePhotoProcessor photos;
  private final AccountApiMapper mapper;
  private final AccountAdmission admission;
  private final HttpServletRequest request;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<AccountResponse> establishAccount(Boolean bypass) {
    Optional<UUID> admitted = requireOrdinaryAccess();
    JwtAuthenticationToken principal = principal();
    EstablishAccount.Outcome outcome =
        admitted.isPresent()
            ? establishment.establishExisting(
                principal.getToken().getIssuer().toString(),
                principal.getToken().getSubject(),
                admitted.orElseThrow())
            : establishment.establish(
                principal.getToken().getIssuer().toString(), principal.getToken().getSubject());
    ReadAccount.View view;
    try {
      view =
          reads.original(
              principal.getToken().getIssuer().toString(),
              principal.getToken().getSubject(),
              outcome.account().id());
    } catch (AccountNotFoundException absent) {
      throw new AccountUnavailableException();
    }
    ResponseEntity.BodyBuilder response =
        outcome.created()
            ? ResponseEntity.created(URI.create("/accounts/" + outcome.account().id()))
            : ResponseEntity.ok();
    return response
        .header("Cache-Control", "no-store")
        .body(mapper.toDto(view.account(), view.hasPhoto(), view.permissions()));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<AccountResponse> getMyAccount() {
    JwtAuthenticationToken principal = principal();
    return response(
        false,
        reads.current(
            principal.getToken().getIssuer().toString(), principal.getToken().getSubject()));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<AccountResponse> getAccount(UUID id, Boolean bypass) {
    requireOrdinaryAccess(id);
    JwtAuthenticationToken principal = principal();
    return response(
        true,
        reads.original(
            principal.getToken().getIssuer().toString(), principal.getToken().getSubject(), id));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<AccountResponse> changeAccountProfile(
      UUID id, ChangeAccountProfileRequest metadata, Boolean bypass, MultipartFile image) {
    requireOrdinaryAccess(id);
    requireProfileParts();
    ProfilePhotoActionEnum action = metadata.getPhotoAction();
    if ((action == ProfilePhotoActionEnum.REPLACE) != (image != null))
      throw new InvalidProfileChangeException();
    ProfilePhoto photo = null;
    if (image != null) {
      try {
        photo = photos.prepare(image.getBytes(), image.getContentType());
      } catch (IOException failure) {
        throw new InvalidProfilePhotoException();
      }
    }
    JwtAuthenticationToken principal = principal();
    return response(
        true,
        changes.change(
            principal.getToken().getIssuer().toString(),
            principal.getToken().getSubject(),
            id,
            metadata.getUsername(),
            action,
            photo));
  }

  /**
   * Rejects unknown/repeated parts rather than silently saving only the first replacement image.
   */
  private void requireProfileParts() {
    Set<String> names = new HashSet<>();
    try {
      for (Part part : request.getParts()) {
        if (!Set.of("metadata", "image").contains(part.getName()) || !names.add(part.getName()))
          throw new InvalidProfileChangeException();
      }
    } catch (IOException | ServletException failure) {
      throw new InvalidProfileChangeException();
    }
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<Void> eraseAccount(UUID id, Boolean bypass) {
    requireOrdinaryAccess(id);
    throw new AccountUnavailableException();
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<Resource> getAccountPhoto(UUID id, Boolean bypass) {
    requireOrdinaryAccess(id);
    JwtAuthenticationToken principal = principal();
    ProfilePhoto photo =
        reads.photo(
            principal.getToken().getIssuer().toString(), principal.getToken().getSubject(), id);
    return ResponseEntity.ok()
        .header("Cache-Control", "no-store")
        .contentType(MediaType.parseMediaType(photo.mediaType()))
        .contentLength(photo.bytes().length)
        .body(new ByteArrayResource(photo.bytes()));
  }

  /**
   * Requires F12's current policy; only current-account identification skips ordinary admission.
   *
   * @return the existing bypass-authorized lifecycle, or empty for inactive maintenance
   * @throws org.springframework.web.server.ResponseStatusException for invalid bypass syntax
   */
  private Optional<UUID> requireOrdinaryAccess() {
    boolean bypass = MaintenanceBypass.requested(request);
    JwtAuthenticationToken principal = principal();
    return admission.requireOrdinaryAccess(
        principal.getToken().getIssuer().toString(), principal.getToken().getSubject(), bypass);
  }

  /**
   * Keeps active personal bypass bound to the same original resource as the account operation.
   *
   * @param original original UUID named by the generated account operation
   * @throws AccountNotFoundException when bypass admitted a different account lifecycle
   */
  private void requireOrdinaryAccess(UUID original) {
    if (requireOrdinaryAccess().filter(id -> !original.equals(id)).isPresent()) {
      throw new AccountNotFoundException();
    }
  }

  /** Returns the JWT already validated and client-authorized by the resource-server filter. */
  private JwtAuthenticationToken principal() {
    return (JwtAuthenticationToken) SecurityContextHolder.getContext().getAuthentication();
  }

  /**
   * Maps current local values into the single generated response representation.
   *
   * @param original whether this is the original resource supporting multipart PATCH
   * @param view owner-authorized read result
   * @return private non-cacheable profile
   */
  private ResponseEntity<AccountResponse> response(boolean original, ReadAccount.View view) {
    ResponseEntity.BodyBuilder response = ResponseEntity.ok().header("Cache-Control", "no-store");
    if (original) response.header("Accept-Patch", "multipart/form-data");
    return response.body(mapper.toDto(view.account(), view.hasPhoto(), view.permissions()));
  }
}
