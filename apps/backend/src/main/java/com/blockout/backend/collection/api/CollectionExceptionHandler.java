package com.blockout.backend.collection.api;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.exception.CollectionNotFoundException;
import com.blockout.backend.collection.application.exception.InvalidSeasonConfirmationException;
import com.blockout.backend.collection.application.exception.InvalidSourceException;
import com.blockout.backend.generated.ingestion.model.ProblemResponse;
import com.blockout.backend.sporting.api.SportingIngestionController;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import java.net.URI;
import org.springframework.core.annotation.Order;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Safe current-state refusals; unexpected infrastructure failures keep the shared HTTP owner. */
@RestControllerAdvice(
    basePackageClasses = {CollectorOperationsController.class, SportingIngestionController.class})
@Order(0)
public class CollectionExceptionHandler {
  /**
   * Translates an expected current-state refusal.
   *
   * @param exception canonical context/configuration refusal
   * @return non-cacheable shared conflict without submitted values
   */
  @ExceptionHandler(CollectionConflictException.class)
  ResponseEntity<ProblemResponse> conflict(CollectionConflictException exception) {
    return ResponseEntity.status(409)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .cacheControl(CacheControl.noStore())
        .body(
            new ProblemResponse(
                URI.create("urn:blockout:problem:" + exception.getType()), "Conflict", 409));
  }

  /**
   * Refuses readable but unusable source input or an inexact closure confirmation without echoing
   * URLs or diagnostics.
   *
   * @return canonical non-cacheable business-input refusal
   */
  @ExceptionHandler({InvalidSourceException.class, InvalidSeasonConfirmationException.class})
  ResponseEntity<ProblemResponse> invalidSource() {
    return ResponseEntity.status(422)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .cacheControl(CacheControl.noStore())
        .body(
            new ProblemResponse(
                URI.create("urn:blockout:problem:unprocessable-content"),
                "Unprocessable Content",
                422));
  }

  /**
   * Reports a missing retained context.
   *
   * @return non-cacheable shared missing-current-context response
   */
  @ExceptionHandler({CollectionNotFoundException.class, SportingResourceNotFoundException.class})
  ResponseEntity<ProblemResponse> notFound() {
    return ResponseEntity.status(404)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .cacheControl(CacheControl.noStore())
        .body(new ProblemResponse(URI.create("urn:blockout:problem:not-found"), "Not Found", 404));
  }
}
