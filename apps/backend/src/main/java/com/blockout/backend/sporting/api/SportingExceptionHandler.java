package com.blockout.backend.sporting.api;

import com.blockout.backend.generated.mobile.model.ProblemResponse;
import com.blockout.backend.shared.http.HttpProblems;
import com.blockout.backend.sporting.application.exception.MatchDocumentUnavailableException;
import com.blockout.backend.sporting.application.exception.SportingConflictException;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.exception.SportingValidationException;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Safe translations of the owning sporting use cases; generic failures stay at the shared boundary.
 */
@RestControllerAdvice
@Order(0)
public class SportingExceptionHandler {
  /**
   * Rejects an unusable sporting command without exposing submitted values.
   *
   * @return a safe non-cacheable whole-command validation refusal without submitted values
   */
  @ExceptionHandler(SportingValidationException.class)
  ResponseEntity<Object> invalidChange() {
    return HttpProblems.response(
        HttpStatus.UNPROCESSABLE_CONTENT, "urn:blockout:problem:unprocessable-content");
  }

  /**
   * Returns only canonical conflict reasons and authorized sporting scope IDs.
   *
   * @param exception complete command refusal
   * @return a non-cacheable 409 Problem Details response
   */
  @ExceptionHandler(SportingConflictException.class)
  ResponseEntity<Object> conflict(SportingConflictException exception) {
    ProblemResponse problem =
        HttpProblems.body(HttpStatus.CONFLICT, "urn:blockout:problem:" + exception.getType());
    if (!exception.getResourceIds().isEmpty())
      problem.setConflictingResourceIds(exception.getResourceIds());
    return HttpProblems.response(problem, HttpHeaders.EMPTY);
  }

  /** Returns an ordinary supplier outage without exposing locators, content or failure details. */
  @ExceptionHandler(MatchDocumentUnavailableException.class)
  ResponseEntity<Object> documentUnavailable() {
    return HttpProblems.response(
        HttpStatus.SERVICE_UNAVAILABLE, "urn:blockout:problem:unavailable");
  }

  /** Does not disclose submitted references in the missing-resource response. */
  @ExceptionHandler(SportingResourceNotFoundException.class)
  ResponseEntity<Object> notFound() {
    return HttpProblems.response(HttpStatus.NOT_FOUND, "urn:blockout:problem:not-found");
  }
}
