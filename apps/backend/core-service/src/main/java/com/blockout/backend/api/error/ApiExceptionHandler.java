package com.blockout.backend.api.error;

import static com.blockout.shared.model.ApiProblemCodeEnum.*;

import com.blockout.shared.model.ApiProblemCodeEnum;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/** Uses Spring MVC's exception handling and headers with the same safe contract as security. */
@RestControllerAdvice
public final class ApiExceptionHandler extends ResponseEntityExceptionHandler {
  private static final Logger LOG = LoggerFactory.getLogger(ApiExceptionHandler.class);

  @ExceptionHandler(DataAccessException.class)
  @Nullable ResponseEntity<Object> persistenceUnavailable(
      DataAccessException failure, WebRequest request) {
    return handleExceptionInternal(
        failure, null, HttpHeaders.EMPTY, HttpStatus.SERVICE_UNAVAILABLE, request);
  }

  @ExceptionHandler(AuthenticationException.class)
  @Nullable ResponseEntity<Object> authenticationRequired(
      AuthenticationException failure, WebRequest request) {
    var headers = new HttpHeaders();
    headers.set(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
    return handleExceptionInternal(failure, null, headers, HttpStatus.UNAUTHORIZED, request);
  }

  @ExceptionHandler(AccessDeniedException.class)
  @Nullable ResponseEntity<Object> accessDenied(AccessDeniedException failure, WebRequest request) {
    return handleExceptionInternal(failure, null, HttpHeaders.EMPTY, HttpStatus.FORBIDDEN, request);
  }

  @ExceptionHandler(Exception.class)
  @Nullable ResponseEntity<Object> unexpected(Exception failure, WebRequest request) {
    return handleExceptionInternal(
        failure, null, HttpHeaders.EMPTY, HttpStatus.INTERNAL_SERVER_ERROR, request);
  }

  @Override
  protected @Nullable ResponseEntity<Object> handleExceptionInternal(
      Exception failure,
      @Nullable Object body,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    if (status.is5xxServerError()) {
      LOG.atError()
          .addKeyValue("event.action", "api.request.failed")
          .setCause(failure)
          .log("API request failed");
    }
    ApiProblemCodeEnum code =
        failure instanceof DataAccessException
            ? PROFILE_STORE_UNAVAILABLE
            : switch (status.value()) {
              case 401 -> AUTHENTICATION_REQUIRED;
              case 403 -> ACCESS_DENIED;
              case 404 -> RESOURCE_NOT_FOUND;
              case 405 -> METHOD_NOT_ALLOWED;
              case 406 -> RESPONSE_NOT_ACCEPTABLE;
              case 415 -> MEDIA_TYPE_NOT_SUPPORTED;
              case 503 -> SERVICE_UNAVAILABLE;
              default -> status.is4xxClientError() ? INVALID_REQUEST : INTERNAL_ERROR;
            };
    var responseHeaders = new HttpHeaders();
    responseHeaders.putAll(headers);
    responseHeaders.setContentType(MediaType.APPLICATION_PROBLEM_JSON);
    responseHeaders.setCacheControl(CacheControl.noStore());
    if (status.value() == 503 && !responseHeaders.containsHeader(HttpHeaders.RETRY_AFTER)) {
      responseHeaders.set(HttpHeaders.RETRY_AFTER, "5");
    }
    return super.handleExceptionInternal(
        failure, ApiProblems.create(status, code), responseHeaders, status, request);
  }
}
