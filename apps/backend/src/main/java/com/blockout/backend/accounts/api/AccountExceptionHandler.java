package com.blockout.backend.accounts.api;

import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import com.blockout.backend.accounts.application.exception.ProviderEmailUnavailableException;
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
