package com.blockout.backend.sporting.api;

import com.blockout.backend.generated.mobile.model.ProblemResponse;
import com.blockout.backend.sporting.application.exception.SportingConflictException;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.exception.SportingValidationException;
import java.net.URI;
import org.springframework.core.annotation.Order;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Safe translations of the owning sporting use cases; generic failures stay at the shared boundary.
 */
@RestControllerAdvice(basePackageClasses = SportingClassificationController.class)
@Order(0)
public class SportingExceptionHandler {
  /**
   * @return a safe non-cacheable whole-command validation refusal without submitted values
   */
  @ExceptionHandler(SportingValidationException.class)
  ResponseEntity<ProblemResponse> invalidChange() {
    return ResponseEntity.unprocessableContent()
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .cacheControl(CacheControl.noStore())
        .body(
            new ProblemResponse(
                URI.create("urn:blockout:problem:unprocessable-content"),
                "Unprocessable Content",
                422));
  }

  /**
   * Returns only canonical conflict reasons and authorized sporting scope IDs.
   *
   * @param exception complete command refusal
   * @return a non-cacheable 409 Problem Details response
   */
  @ExceptionHandler(SportingConflictException.class)
  ResponseEntity<ProblemResponse> conflict(SportingConflictException exception) {
    ProblemResponse problem =
        new ProblemResponse(
            URI.create("urn:blockout:problem:" + exception.getType()), "Conflict", 409);
    if (!exception.getResourceIds().isEmpty())
      problem.setConflictingResourceIds(exception.getResourceIds());
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .cacheControl(CacheControl.noStore())
        .body(problem);
  }

  /**
   * Refuses a changed audience atomically; a later ordinary collection may accept the observation.
   *
   * @return canonical private conflict without announcing an unprocessed result
   */
  @ExceptionHandler(
      com.blockout.backend.notifications.application.AnnouncementAudienceChangedException.class)
  ResponseEntity<ProblemResponse> audienceChanged() {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .cacheControl(CacheControl.noStore())
        .body(new ProblemResponse(URI.create("urn:blockout:problem:conflict"), "Conflict", 409));
  }

  /** Does not disclose submitted references in the missing-resource response. */
  @ExceptionHandler(SportingResourceNotFoundException.class)
  ResponseEntity<ProblemResponse> notFound() {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .cacheControl(CacheControl.noStore())
        .body(new ProblemResponse(URI.create("urn:blockout:problem:not-found"), "Not Found", 404));
  }
}
