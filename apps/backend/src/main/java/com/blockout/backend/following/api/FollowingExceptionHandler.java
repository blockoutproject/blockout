package com.blockout.backend.following.api;

import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.following.application.FollowUnavailableTargetException;
import com.blockout.backend.generated.mobile.model.ProblemResponse;
import java.net.URI;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Following-owned refusals/outages; unexpected failures retain the shared HTTP owner. */
@RestControllerAdvice(assignableTypes = FollowingController.class)
@Order(0)
@Slf4j
public class FollowingExceptionHandler {
  /**
   * Hides disappeared original accounts and unavailable sporting targets without their identity.
   */
  @ExceptionHandler({AccountNotFoundException.class, FollowUnavailableTargetException.class})
  ResponseEntity<ProblemResponse> notFound() {
    return problem(HttpStatus.NOT_FOUND, "not-found");
  }

  /**
   * Translates known database outages once, through the existing safe throwable renderer.
   * Integrity/programming failures remain unexpected and are not disguised as retryable outages.
   *
   * @param failure database resource or transaction acquisition failure
   * @return canonical opaque 503 without relationship data
   */
  @ExceptionHandler({
    DataAccessResourceFailureException.class,
    CannotCreateTransactionException.class
  })
  ResponseEntity<ProblemResponse> unavailable(Exception failure) {
    log.atError()
        .addKeyValue("operation", "follow_access")
        .addKeyValue("outcome", "unavailable")
        .setCause(failure)
        .log("Following storage unavailable");
    return problem(HttpStatus.SERVICE_UNAVAILABLE, "unavailable");
  }

  /**
   * Builds a non-cacheable canonical Problem Details representation without rejected values.
   *
   * @param status canonical HTTP status
   * @param type canonical problem suffix
   * @return safe transport error
   */
  private ResponseEntity<ProblemResponse> problem(HttpStatus status, String type) {
    return ResponseEntity.status(status)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .cacheControl(CacheControl.noStore())
        .body(
            new ProblemResponse(
                URI.create("urn:blockout:problem:" + type),
                status.getReasonPhrase(),
                status.value()));
  }
}
