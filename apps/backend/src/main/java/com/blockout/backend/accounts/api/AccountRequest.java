package com.blockout.backend.accounts.api;

import com.blockout.backend.access.api.MaintenanceBypass;
import com.blockout.backend.accounts.application.AccountAdmission;
import com.blockout.backend.accounts.application.AccountContext;
import com.blockout.backend.accounts.application.ProfilePhoto;
import com.blockout.backend.accounts.application.ProfilePhotoPreparation;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.accounts.application.exception.InvalidProfileChangeException;
import com.blockout.backend.accounts.application.exception.InvalidProfilePhotoException;
import com.blockout.backend.generated.mobile.model.ProfilePhotoActionEnum;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.Part;
import java.io.IOException;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

/** Binds account HTTP context and multipart transport before application reads or writes. */
@Component
@RequiredArgsConstructor
public class AccountRequest {
  private final AccountAdmission admission;
  private final ProfilePhotoPreparation photos;
  private final HttpServletRequest request;

  /**
   * Captures the validated JWT for local identification, which remains available in maintenance.
   *
   * @return principal context without ordinary admission or account creation
   */
  public AccountContext current() {
    JwtAuthenticationToken principal =
        (JwtAuthenticationToken) SecurityContextHolder.getContext().getAuthentication();
    return new AccountContext(
        principal.getToken().getIssuer().toString(),
        principal.getToken().getSubject(),
        Optional.empty());
  }

  /**
   * Binds exact header syntax and current F12 admission before ordinary account operations.
   *
   * @return principal retaining the optional original lifecycle admitted by personal bypass
   * @throws org.springframework.web.server.ResponseStatusException for invalid bypass syntax
   */
  public AccountContext ordinary() {
    boolean bypass = MaintenanceBypass.requested(request);
    AccountContext principal = current();
    return new AccountContext(
        principal.issuer(),
        principal.subject(),
        admission.requireOrdinaryAccess(principal.issuer(), principal.subject(), bypass));
  }

  /**
   * Applies ordinary admission and the application-owned original-lifecycle constraint.
   *
   * @param original business UUID addressed by the generated operation
   * @return admitted principal for the original resource
   * @throws AccountNotFoundException when personal bypass admitted a different lifecycle
   */
  public AccountContext original(UUID original) {
    AccountContext context = ordinary();
    context.requireOriginalAccount(original);
    return context;
  }

  /**
   * Checks multipart shape and prepares accepted pixels before the account write transaction.
   *
   * @param action generated photo intent, or null to preserve the current image
   * @param image optional multipart image, present only for replacement
   * @return prepared image, or null when no replacement was requested
   * @throws InvalidProfileChangeException for unknown/repeated parts or inconsistent intent
   * @throws InvalidProfilePhotoException when multipart bytes cannot be read
   */
  public ProfilePhoto profilePhoto(ProfilePhotoActionEnum action, MultipartFile image) {
    requireProfileParts();
    ProfilePhoto.requireConsistentIntent(action, image != null);
    if (image == null) return null;
    try {
      return photos.prepare(image.getBytes(), image.getContentType());
    } catch (IOException failure) {
      throw new InvalidProfilePhotoException();
    }
  }

  /**
   * Rejects unknown/repeated parts that ordinary multipart binding would otherwise discard.
   *
   * @throws InvalidProfileChangeException for unsupported shape or unreadable multipart metadata
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
}
