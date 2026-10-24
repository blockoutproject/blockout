package com.blockout.backend.search.api;

import com.blockout.backend.generated.mobile.model.ProblemResponse;
import com.blockout.backend.search.application.SearchUnavailableException;
import java.net.URI;
import org.springframework.core.annotation.Order;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Maps failed or incomplete search evaluation to the existing safe retryable problem. */
@RestControllerAdvice(basePackageClasses = DiscoveryController.class)
@Order(0)
public class DiscoveryExceptionHandler {
  /**
   * Keeps query text and engine payloads outside the public failure profile and generic logging.
   *
   * @param failure safe search evaluation failure
   * @return ordinary no-store AccessUnavailable response
   */
  @ExceptionHandler(SearchUnavailableException.class)
  ResponseEntity<ProblemResponse> unavailable(SearchUnavailableException failure) {
    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .cacheControl(CacheControl.noStore())
        .body(
            new ProblemResponse(
                URI.create("urn:blockout:problem:unavailable"), "Service Unavailable", 503));
  }
}
