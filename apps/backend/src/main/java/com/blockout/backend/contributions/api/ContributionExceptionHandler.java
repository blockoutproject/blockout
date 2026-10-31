package com.blockout.backend.contributions.api;

import com.blockout.backend.contributions.application.ContributionConflictException;
import com.blockout.backend.contributions.application.ContributionRejectedException;
import com.blockout.backend.shared.http.HttpProblems;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Safe contribution policy translations; unexpected SQL failures retain the shared HTTP owner. */
@RestControllerAdvice
@Order(0)
public class ContributionExceptionHandler {

  /**
   * Refuses an empty normalized report reason without logging its private input.
   *
   * @param failure safe bounded validation failure
   * @return canonical non-cacheable business refusal
   */
  @ExceptionHandler(
      com.blockout.backend.contributions.application.ReportContribution.InvalidReason.class)
  ResponseEntity<Object> invalidReportReason(
      com.blockout.backend.contributions.application.ReportContribution.InvalidReason failure) {
    return HttpProblems.response(
        HttpStatus.UNPROCESSABLE_CONTENT, "urn:blockout:problem:unprocessable-content");
  }

  /**
   * Refuses an incompatible exact-version action without exposing another contribution's state.
   *
   * @param failure bounded lifecycle conflict
   * @return canonical private conflict for a later explicit action with its viewed revision
   */
  @ExceptionHandler(ContributionConflictException.class)
  ResponseEntity<Object> conflict(ContributionConflictException failure) {
    return HttpProblems.response(HttpStatus.CONFLICT, "urn:blockout:problem:conflict");
  }

  /**
   * Maps current policy refusal without exposing addresses, identities or technical faults.
   *
   * @param failure safe typed current refusal
   * @return canonical private error
   */
  @ExceptionHandler(ContributionRejectedException.class)
  ResponseEntity<Object> rejected(ContributionRejectedException failure) {
    return switch (failure.getStatus()) {
      case STALE_REVISION ->
          HttpProblems.response(HttpStatus.CONFLICT, "urn:blockout:problem:stale-revision");
      case MATCH_UNAVAILABLE ->
          HttpProblems.response(HttpStatus.NOT_FOUND, "urn:blockout:problem:not-found");
      case ACCOUNT_AGE_UNKNOWN ->
          HttpProblems.response(HttpStatus.SERVICE_UNAVAILABLE, "urn:blockout:problem:unavailable");
      case FORBIDDEN, NOT_OWNER ->
          HttpProblems.response(HttpStatus.FORBIDDEN, "urn:blockout:problem:forbidden");
      default ->
          HttpProblems.response(
              HttpStatus.UNPROCESSABLE_CONTENT, "urn:blockout:problem:unprocessable-content");
    };
  }
}
