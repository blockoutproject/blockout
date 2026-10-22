package com.blockout.backend.accounts.api;

import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import com.blockout.backend.accounts.application.exception.InvalidProfileChangeException;
import com.blockout.backend.accounts.application.exception.InvalidProfilePhotoException;
import com.blockout.backend.accounts.application.exception.ProfilePhotoTooLargeException;
import com.blockout.backend.accounts.application.exception.ProviderEmailUnavailableException;
import com.blockout.backend.accounts.application.exception.UnsupportedProfilePhotoException;
import com.blockout.backend.accounts.application.exception.UsernameUnavailableException;
import com.blockout.backend.generated.mobile.model.ProblemResponse;
import java.net.URI;
import org.springframework.core.annotation.Order;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Expected account refusals; unexpected infrastructure failures retain their shared HTTP owner. */
@RestControllerAdvice(assignableTypes = AccountsController.class)
@Order(0)
public class AccountExceptionHandler {
  /** Returns the canonical whole-save input refusal, without rejected values. */
  @ExceptionHandler(InvalidProfileChangeException.class)
  ResponseEntity<ProblemResponse> invalidChange() {
    return profileProblem(400, "invalid-request");
  }

  /** Returns a collision refusal without disclosing the competing account. */
  @ExceptionHandler(UsernameUnavailableException.class)
  ResponseEntity<ProblemResponse> usernameUnavailable() {
    return profileProblem(409, "username-unavailable");
  }

  /** Returns a bounded upload refusal, including reencoded output that exceeds the bound. */
  @ExceptionHandler(ProfilePhotoTooLargeException.class)
  ResponseEntity<ProblemResponse> photoTooLarge() {
    return profileProblem(413, "payload-too-large");
  }

  /** Refuses unsupported photo media declarations before persistence. */
  @ExceptionHandler(UnsupportedProfilePhotoException.class)
  ResponseEntity<ProblemResponse> unsupportedPhoto() {
    return profileProblem(415, "unsupported-media-type");
  }

  /** Refuses actual invalid image content without publishing decoder details. */
  @ExceptionHandler(InvalidProfilePhotoException.class)
  ResponseEntity<ProblemResponse> invalidPhoto() {
    return profileProblem(422, "invalid-image");
  }

  /**
   * Builds a canonical, non-cacheable profile refusal at its single API translation owner.
   *
   * @param status canonical status
   * @param type canonical problem suffix
   * @return safe generated Problem Details
   */
  private ResponseEntity<ProblemResponse> profileProblem(int status, String type) {
    return ResponseEntity.status(status)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .cacheControl(CacheControl.noStore())
        .body(
            new ProblemResponse(
                URI.create("urn:blockout:problem:" + type),
                org.springframework.http.HttpStatus.valueOf(status).getReasonPhrase(),
                status));
  }

  /** Hides missing or differently owned original accounts without disclosing identifiers. */
  @ExceptionHandler(AccountNotFoundException.class)
  ResponseEntity<ProblemResponse> notFound() {
    return ResponseEntity.status(404)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .cacheControl(CacheControl.noStore())
        .body(new ProblemResponse(URI.create("urn:blockout:problem:not-found"), "Not Found", 404));
  }

  /**
   * Rejects first creation without a usable provider address, without persisting a partial account.
   */
  @ExceptionHandler(ProviderEmailUnavailableException.class)
  ResponseEntity<ProblemResponse> missingProviderEmail() {
    return ResponseEntity.status(422)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .cacheControl(CacheControl.noStore())
        .body(
            new ProblemResponse(
                URI.create("urn:blockout:problem:provider-email-unavailable"),
                "Unprocessable Content",
                422));
  }

  /** Reports unavailable evidence/admission without publishing provider messages or payloads. */
  @ExceptionHandler(AccountUnavailableException.class)
  ResponseEntity<ProblemResponse> unavailable() {
    return ResponseEntity.status(503)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .cacheControl(CacheControl.noStore())
        .body(
            new ProblemResponse(
                URI.create("urn:blockout:problem:unavailable"), "Service Unavailable", 503));
  }
}
