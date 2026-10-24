package com.blockout.backend.contributions.api;

import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.contributions.application.ContributionRejectedException;
import com.blockout.backend.generated.mobile.model.ProblemResponse;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import java.net.URI;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Safe contribution policy translations; unexpected SQL failures retain the shared HTTP owner. */
@RestControllerAdvice(assignableTypes = ContributionsController.class)
@Order(0)
@lombok.extern.slf4j.Slf4j
public class ContributionExceptionHandler {
  /** Hides unknown/foreign members and disappeared original lifecycles. */
  @ExceptionHandler({AccountNotFoundException.class, SportingResourceNotFoundException.class})
  ResponseEntity<ProblemResponse> missing() {
    return problem(HttpStatus.NOT_FOUND, "not-found");
  }

  /**
   * Maps current policy refusal without exposing addresses, identities or technical faults.
   *
   * @param failure safe typed current refusal
   * @return canonical private error
   */
  @ExceptionHandler(ContributionRejectedException.class)
  ResponseEntity<ProblemResponse> rejected(ContributionRejectedException failure) {
    return switch (failure.getStatus()) {
      case STALE_REVISION -> problem(HttpStatus.CONFLICT, "stale-revision");
      case MATCH_UNAVAILABLE -> problem(HttpStatus.NOT_FOUND, "not-found");
      case ACCOUNT_AGE_UNKNOWN -> problem(HttpStatus.SERVICE_UNAVAILABLE, "unavailable");
      case FORBIDDEN, NOT_OWNER -> problem(HttpStatus.FORBIDDEN, "forbidden");
      default -> problem(HttpStatus.UNPROCESSABLE_CONTENT, "unprocessable-content");
    };
  }

  /**
   * Translates known storage acquisition outages once without exposing submitted values.
   *
   * @param failure resource or transaction acquisition outage
   * @return canonical unavailable response; integrity/programming faults remain unexpected
   */
  @ExceptionHandler({
    DataAccessResourceFailureException.class,
    CannotCreateTransactionException.class
  })
  ResponseEntity<ProblemResponse> unavailable(Exception failure) {
    log.atError()
        .addKeyValue("operation", "contribution_access")
        .addKeyValue("outcome", "unavailable")
        .setCause(failure)
        .log("Contribution storage unavailable");
    return problem(HttpStatus.SERVICE_UNAVAILABLE, "unavailable");
  }

  /**
   * Builds canonical opaque private errors.
   *
   * @param status canonical HTTP status
   * @param type canonical problem suffix
   * @return no-store Problem Details
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
