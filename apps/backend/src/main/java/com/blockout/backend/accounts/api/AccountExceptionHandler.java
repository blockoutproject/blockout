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
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Account refusals and storage outages; unexpected failures retain their shared HTTP owner. */
@RestControllerAdvice(assignableTypes = AccountsController.class)
@Order(0)
@Slf4j
public class AccountExceptionHandler {
  /** Returns the canonical whole-save input refusal, without rejected values. */
  @ExceptionHandler(InvalidProfileChangeException.class)
  ResponseEntity<ProblemResponse> invalidChange() {
    return accountProblem(400, "invalid-request");
  }

  /** Returns a collision refusal without disclosing the competing account. */
  @ExceptionHandler(UsernameUnavailableException.class)
  ResponseEntity<ProblemResponse> usernameUnavailable() {
    return accountProblem(409, "username-unavailable");
  }

  /** Returns a bounded upload refusal, including reencoded output that exceeds the bound. */
  @ExceptionHandler(ProfilePhotoTooLargeException.class)
  ResponseEntity<ProblemResponse> photoTooLarge() {
    return accountProblem(413, "payload-too-large");
  }

  /** Refuses unsupported photo media declarations before persistence. */
  @ExceptionHandler(UnsupportedProfilePhotoException.class)
  ResponseEntity<ProblemResponse> unsupportedPhoto() {
    return accountProblem(415, "unsupported-media-type");
  }

  /** Refuses actual invalid image content without publishing decoder details. */
  @ExceptionHandler(InvalidProfilePhotoException.class)
  ResponseEntity<ProblemResponse> invalidPhoto() {
    return accountProblem(422, "invalid-image");
  }

  /**
   * Builds a canonical, non-cacheable account refusal at its single API translation owner.
   *
   * @param status canonical status
   * @param type canonical problem suffix
   * @return safe generated Problem Details
   */
  private ResponseEntity<ProblemResponse> accountProblem(int status, String type) {
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
    return accountProblem(404, "not-found");
  }

  /**
   * Rejects first creation without a usable provider address, without persisting a partial account.
   */
  @ExceptionHandler(ProviderEmailUnavailableException.class)
  ResponseEntity<ProblemResponse> missingProviderEmail() {
    return accountProblem(422, "provider-email-unavailable");
  }

  /** Reports unavailable evidence/admission without publishing provider messages or payloads. */
  @ExceptionHandler(AccountUnavailableException.class)
  ResponseEntity<ProblemResponse> unavailable() {
    return accountProblem(503, "unavailable");
  }

  /**
   * Translates known storage outages without treating integrity or programming failures as
   * temporary unavailability. The configured telemetry encoder retains only safe throwable type.
   *
   * @param failure unavailable database resource or transaction acquisition
   * @return the canonical non-cacheable unavailable account response
   */
  @ExceptionHandler({
    DataAccessResourceFailureException.class,
    CannotCreateTransactionException.class
  })
  ResponseEntity<ProblemResponse> storageUnavailable(Exception failure) {
    log.atError()
        .addKeyValue("operation", "account_access")
        .addKeyValue("outcome", "unavailable")
        .setCause(failure)
        .log("Account storage unavailable");
    return unavailable();
  }
}
