package com.blockout.backend.shared.http;

import com.blockout.backend.access.api.AccessApiMapper;
import com.blockout.backend.access.domain.MaintenanceRequiredException;
import com.blockout.backend.access.domain.MaintenanceSettings;
import com.blockout.backend.generated.mobile.model.AccessProblemResponse;
import com.blockout.backend.generated.mobile.model.ProblemResponse;
import java.net.URI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/** Translates framework failures without exposing rejected values or exception messages. */
@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {
  private static final Logger LOG = LoggerFactory.getLogger(ApiExceptionHandler.class);

  /**
   * Publishes the active restriction observed at admission, without claiming a reopening time.
   *
   * @param failure current maintenance refusal, distinct from unavailable configuration/provider
   * @return the generated typed, non-cacheable maintenance problem
   */
  @ExceptionHandler(MaintenanceRequiredException.class)
  ResponseEntity<Object> maintenanceRequired(MaintenanceRequiredException failure) {
    MaintenanceSettings maintenance = failure.getMaintenance();
    if (!maintenance.active()) {
      LOG.atError()
          .addKeyValue("operation", "maintenance_refusal")
          .addKeyValue("outcome", "unavailable")
          .addKeyValue("reason", "inactive_maintenance")
          .log("Inconsistent maintenance refusal");
      return safeProblem(
          HttpStatus.SERVICE_UNAVAILABLE, "urn:blockout:problem:unavailable", new HttpHeaders());
    }
    AccessProblemResponse problem =
        new AccessProblemResponse(
                URI.create("urn:blockout:problem:maintenance"), "Service Unavailable", 503)
            .maintenance(AccessApiMapper.toPublicDto(maintenance));
    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .cacheControl(org.springframework.http.CacheControl.noStore())
        .body(problem);
  }

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
          case 422 -> "urn:blockout:problem:unprocessable-content";
          case 415 -> "urn:blockout:problem:unsupported-media-type";
          case 503 -> "urn:blockout:problem:unavailable";
          default -> "about:blank";
        };
    return safeProblem(status, type, headers);
  }

  /**
   * Keeps unexpected failures opaque and leaves access refusals to the native security chain.
   *
   * @param exception failure; authorization refusals are propagated without logging
   * @return a generic RFC 9457 response without the exception payload
   * @throws AccessDeniedException for the existing Bearer authorization handler to translate
   */
  @ExceptionHandler(Exception.class)
  ResponseEntity<Object> unexpectedFailure(Exception exception) {
    if (exception instanceof AccessDeniedException denied) {
      throw denied;
    }
    LOG.atError()
        .addKeyValue("operation", "http_request")
        .addKeyValue("outcome", "failed")
        .setCause(exception)
        .log("HTTP boundary failed unexpectedly");
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
  protected ResponseEntity<Object> safeProblem(
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
