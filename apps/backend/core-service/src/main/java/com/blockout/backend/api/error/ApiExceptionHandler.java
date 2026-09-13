package com.blockout.backend.api.error;

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

  /**
   * Translates profile-store failures to a retryable 503 without database diagnostics.
   *
   * @param failure exception classified by Spring MVC
   * @param request current request used for native response handling
   * @return the problem response, or null if Spring cannot write a committed response
   */
  @ExceptionHandler(DataAccessException.class)
  @Nullable ResponseEntity<Object> persistenceUnavailable(
      DataAccessException failure, WebRequest request) {
    return handleExceptionInternal(
        failure, null, HttpHeaders.EMPTY, HttpStatus.SERVICE_UNAVAILABLE, request);
  }

  /**
   * Returns a safe 401 with the standard Bearer challenge.
   *
   * @param failure exception classified by Spring MVC
   * @param request current request used for native response handling
   * @return the problem response, or null if Spring cannot write a committed response
   */
  @ExceptionHandler(AuthenticationException.class)
  @Nullable ResponseEntity<Object> authenticationRequired(
      AuthenticationException failure, WebRequest request) {
    HttpHeaders headers = new HttpHeaders();
    headers.set(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
    return handleExceptionInternal(failure, null, headers, HttpStatus.UNAUTHORIZED, request);
  }

  /**
   * Returns 403 for an authenticated caller lacking permission.
   *
   * @param failure exception classified by Spring MVC
   * @param request current request used for native response handling
   * @return the problem response, or null if Spring cannot write a committed response
   */
  @ExceptionHandler(AccessDeniedException.class)
  @Nullable ResponseEntity<Object> accessDenied(AccessDeniedException failure, WebRequest request) {
    return handleExceptionInternal(failure, null, HttpHeaders.EMPTY, HttpStatus.FORBIDDEN, request);
  }

  /**
   * Handles unclassified MVC failures as safe 500 responses and logs once at this boundary.
   *
   * @param failure exception classified by Spring MVC
   * @param request current request used for native response handling
   * @return the problem response, or null if Spring cannot write a committed response
   */
  @ExceptionHandler(Exception.class)
  @Nullable ResponseEntity<Object> unexpected(Exception failure, WebRequest request) {
    return handleExceptionInternal(
        failure, null, HttpHeaders.EMPTY, HttpStatus.INTERNAL_SERVER_ERROR, request);
  }

  /** {@inheritDoc} */
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
            ? storageFailure(request)
            : switch (status.value()) {
              case 401 -> ApiProblemCodeEnum.AUTHENTICATION_REQUIRED;
              case 403 -> ApiProblemCodeEnum.ACCESS_DENIED;
              case 404 -> ApiProblemCodeEnum.RESOURCE_NOT_FOUND;
              case 405 -> ApiProblemCodeEnum.METHOD_NOT_ALLOWED;
              case 406 -> ApiProblemCodeEnum.RESPONSE_NOT_ACCEPTABLE;
              case 415 -> ApiProblemCodeEnum.MEDIA_TYPE_NOT_SUPPORTED;
              case 503 -> ApiProblemCodeEnum.SERVICE_UNAVAILABLE;
              default ->
                  status.is4xxClientError()
                      ? ApiProblemCodeEnum.INVALID_REQUEST
                      : ApiProblemCodeEnum.INTERNAL_ERROR;
            };
    HttpHeaders responseHeaders = new HttpHeaders();
    responseHeaders.putAll(headers);
    responseHeaders.setContentType(MediaType.APPLICATION_PROBLEM_JSON);
    responseHeaders.setCacheControl(CacheControl.noStore());
    if (status.value() == 503 && !responseHeaders.containsHeader(HttpHeaders.RETRY_AFTER)) {
      responseHeaders.set(HttpHeaders.RETRY_AFTER, "5");
    }
    return super.handleExceptionInternal(
        failure, ApiProblems.create(status, code), responseHeaders, status, request);
  }

  /**
   * Selects the owning store failure code using only the HTTP resource boundary.
   *
   * @param request current HTTP context
   * @return stable public storage classification without database diagnostics
   */
  private static ApiProblemCodeEnum storageFailure(WebRequest request) {
    if (sportsRequest(request)) return ApiProblemCodeEnum.SPORTS_STORE_UNAVAILABLE;
    if (subscriptionRequest(request)) return ApiProblemCodeEnum.SUBSCRIPTION_STORE_UNAVAILABLE;
    return ApiProblemCodeEnum.PROFILE_STORE_UNAVAILABLE;
  }

  /**
   * Determines whether sporting administration owns the failed request.
   *
   * @param request current HTTP context
   * @return whether the request is a sports-owned administration or import read
   */
  private static boolean sportsRequest(WebRequest request) {
    String resource = request.getDescription(false);
    return resource.startsWith("uri=/api/v2/admin/")
        || resource.startsWith("uri=/api/v2/imports/ffvb/");
  }

  /**
   * Selects the owning persistence failure code without exposing request content.
   *
   * @param request current HTTP context
   * @return whether the subscription/webhook resource owns the failing operation
   */
  private static boolean subscriptionRequest(WebRequest request) {
    String resource = request.getDescription(false);
    return resource.startsWith("uri=/api/v2/users/me/subscription")
        || resource.equals("uri=/api/v2/webhooks/revenuecat");
  }
}
