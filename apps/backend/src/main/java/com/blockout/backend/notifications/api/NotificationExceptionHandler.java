package com.blockout.backend.notifications.api;

import com.blockout.backend.notifications.application.NotificationNotFoundException;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Canonical safe errors at the private inbox boundary, without storage or personal payloads. */
@RestControllerAdvice(assignableTypes = NotificationsController.class)
@Order(0)
public class NotificationExceptionHandler extends ApiExceptionHandler {
  /**
   * Hides unavailable personal and sporting targets with the canonical error.
   *
   * @return canonical deliberately unavailable personal resource response
   */
  @ExceptionHandler({NotificationNotFoundException.class, SportingResourceNotFoundException.class})
  ResponseEntity<Object> missing() {
    return safeProblem(HttpStatus.NOT_FOUND, "urn:blockout:problem:not-found", new HttpHeaders());
  }

  /**
   * Reports temporary storage unavailability without internal diagnostics.
   *
   * @return canonical temporary storage failure response without internal details
   */
  @ExceptionHandler({DataAccessException.class, CannotCreateTransactionException.class})
  ResponseEntity<Object> unavailable() {
    return safeProblem(
        HttpStatus.SERVICE_UNAVAILABLE, "urn:blockout:problem:unavailable", new HttpHeaders());
  }
}
