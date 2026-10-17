package com.blockout.backend.shared.http;

import com.blockout.backend.generated.mobile.model.ProblemResponse;
import java.net.URI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/** Translates framework failures without exposing rejected values or exception messages. */
@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {
  private static final Logger LOG = LoggerFactory.getLogger(ApiExceptionHandler.class);

  /** {@inheritDoc} */
  @Override
  protected ResponseEntity<Object> handleExceptionInternal(
      Exception exception,
      Object body,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    String type =
        switch (status.value()) {
          case 400 -> "urn:blockout:problem:invalid-request";
          case 404 -> "urn:blockout:problem:not-found";
          case 413 -> "urn:blockout:problem:payload-too-large";
          case 415 -> "urn:blockout:problem:unsupported-media-type";
          default -> "about:blank";
        };
    return safeProblem(status, type, headers);
  }

  /**
   * Keeps unexpected failures opaque; domain-specific translations remain with their owner.
   *
   * @param exception unexpected failure; only its class name is logged
   * @return a generic RFC 9457 response without the exception payload
   */
  @ExceptionHandler(Exception.class)
  ResponseEntity<Object> unexpectedFailure(Exception exception) {
    LOG.error(
        "HTTP boundary failed unexpectedly (exceptionType={})",
        exception.getClass().getSimpleName());
    return safeProblem(HttpStatus.INTERNAL_SERVER_ERROR, "about:blank", new HttpHeaders());
  }

  /**
   * Builds the canonical generated Problem Response using canonical identifiers and safe status
   * titles.
   *
   * @param status HTTP response status
   * @param type canonical problem identifier or RFC's generic fallback
   * @param suppliedHeaders framework headers such as Allow and Accept
   * @return a non-cacheable problem response
   */
  private ResponseEntity<Object> safeProblem(
      HttpStatusCode status, String type, HttpHeaders suppliedHeaders) {
    ProblemResponse problem =
        new ProblemResponse(
            URI.create(type), HttpStatus.valueOf(status.value()).getReasonPhrase(), status.value());
    HttpHeaders headers = new HttpHeaders();
    headers.putAll(suppliedHeaders);
    headers.setContentType(MediaType.APPLICATION_PROBLEM_JSON);
    headers.setCacheControl("no-store");
    return new ResponseEntity<>(problem, headers, status);
  }
}
