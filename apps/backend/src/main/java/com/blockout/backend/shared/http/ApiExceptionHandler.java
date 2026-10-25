package com.blockout.backend.shared.http;

import com.blockout.backend.access.api.AccessApiMapper;
import com.blockout.backend.access.domain.MaintenanceRequiredException;
import com.blockout.backend.access.domain.MaintenanceSettings;
import com.blockout.backend.generated.mobile.model.AccessProblemResponse;
import java.net.URI;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/** Translates framework failures without exposing rejected values or exception messages. */
@RestControllerAdvice
@Order(Ordered.LOWEST_PRECEDENCE)
@Slf4j
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {

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
      log.atError()
          .addKeyValue("operation", "maintenance_refusal")
          .addKeyValue("outcome", "unavailable")
          .addKeyValue("reason", "inactive_maintenance")
          .log("Inconsistent maintenance refusal");
      return HttpProblems.response(
          HttpStatus.SERVICE_UNAVAILABLE, "urn:blockout:problem:unavailable");
    }
    AccessProblemResponse problem =
        new AccessProblemResponse(
                URI.create("urn:blockout:problem:maintenance"), "Service Unavailable", 503)
            .maintenance(AccessApiMapper.toPublicDto(maintenance));
    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .cacheControl(CacheControl.noStore())
        .body(problem);
  }

  /**
   * {@inheritDoc}
   *
   * <p>Only replaces the final public representation. Spring retains committed-response handling,
   * error request attributes, status selection and protocol headers.
   */
  @Override
  protected ResponseEntity<Object> createResponseEntity(
      Object body, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
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
    return HttpProblems.response(HttpProblems.body(status, type), headers);
  }

  /**
   * Translates known storage acquisition outages once for every MVC entrypoint.
   *
   * @param failure database resource or transaction acquisition failure, logged through the safe
   *     encoder
   * @return opaque unavailable response; integrity and programming failures remain unexpected
   */
  @ExceptionHandler({
    DataAccessResourceFailureException.class,
    CannotCreateTransactionException.class
  })
  ResponseEntity<Object> storageUnavailable(Exception failure) {
    log.atError()
        .addKeyValue("operation", "http_request")
        .addKeyValue("outcome", "unavailable")
        .setCause(failure)
        .log("HTTP storage unavailable");
    return HttpProblems.response(
        HttpStatus.SERVICE_UNAVAILABLE, "urn:blockout:problem:unavailable");
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
    log.atError()
        .addKeyValue("operation", "http_request")
        .addKeyValue("outcome", "failed")
        .setCause(exception)
        .log("HTTP boundary failed unexpectedly");
    return HttpProblems.response(HttpStatus.INTERNAL_SERVER_ERROR, "about:blank");
  }
}
