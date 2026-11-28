package com.blockout.backend.collection.api;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.exception.CollectionNotFoundException;
import com.blockout.backend.collection.application.exception.InvalidSeasonConfirmationException;
import com.blockout.backend.collection.application.exception.InvalidSourceException;
import com.blockout.backend.shared.http.HttpProblems;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Safe current-state refusals; unexpected infrastructure failures keep the shared HTTP owner. */
@RestControllerAdvice
@Order(0)
public class CollectionExceptionHandler {
  /**
   * Translates an expected current-state refusal.
   *
   * @param exception canonical context/configuration refusal
   * @return non-cacheable shared conflict without submitted values
   */
  @ExceptionHandler(CollectionConflictException.class)
  ResponseEntity<Object> conflict(CollectionConflictException exception) {
    return HttpProblems.response(
        HttpStatus.CONFLICT, "urn:blockout:problem:" + exception.getType());
  }

  /**
   * Refuses readable but unusable source input or an inexact closure confirmation without echoing
   * URLs or diagnostics.
   *
   * @return canonical non-cacheable business-input refusal
   */
  @ExceptionHandler({InvalidSourceException.class, InvalidSeasonConfirmationException.class})
  ResponseEntity<Object> invalidSource() {
    return HttpProblems.response(
        HttpStatus.UNPROCESSABLE_CONTENT, "urn:blockout:problem:unprocessable-content");
  }

  /**
   * Reports a missing retained context.
   *
   * @return non-cacheable shared missing-current-context response
   */
  @ExceptionHandler(CollectionNotFoundException.class)
  ResponseEntity<Object> notFound() {
    return HttpProblems.response(HttpStatus.NOT_FOUND, "urn:blockout:problem:not-found");
  }
}
