package com.blockout.backend.notifications.api;

import com.blockout.backend.notifications.application.NotificationNotFoundException;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Canonical safe errors at the private inbox boundary, without storage or personal payloads. */
@RestControllerAdvice(assignableTypes = NotificationsController.class)
@Order(0)
@Slf4j
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
   * Records storage acquisition outages once through the existing safe logging path.
   *
   * @param failure resource or transaction acquisition outage
   * @return canonical temporary storage failure response without internal details
   */
  @ExceptionHandler({
    DataAccessResourceFailureException.class,
    CannotCreateTransactionException.class
  })
  ResponseEntity<Object> unavailable(Exception failure) {
    log.atError()
        .addKeyValue("operation", "notification_access")
        .addKeyValue("outcome", "unavailable")
        .setCause(failure)
        .log("Notification storage unavailable");
    return safeProblem(
        HttpStatus.SERVICE_UNAVAILABLE, "urn:blockout:problem:unavailable", new HttpHeaders());
  }
}
