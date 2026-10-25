package com.blockout.backend.search.api;

import com.blockout.backend.search.application.SearchUnavailableException;
import com.blockout.backend.shared.http.HttpProblems;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Maps failed or incomplete search evaluation to the existing safe retryable problem. */
@RestControllerAdvice
@Order(0)
public class DiscoveryExceptionHandler {
  /**
   * Keeps query text and engine payloads outside the public failure profile and generic logging.
   *
   * @param failure safe search evaluation failure
   * @return ordinary no-store AccessUnavailable response
   */
  @ExceptionHandler(SearchUnavailableException.class)
  ResponseEntity<Object> unavailable(SearchUnavailableException failure) {
    return HttpProblems.response(
        HttpStatus.SERVICE_UNAVAILABLE, "urn:blockout:problem:unavailable");
  }
}
