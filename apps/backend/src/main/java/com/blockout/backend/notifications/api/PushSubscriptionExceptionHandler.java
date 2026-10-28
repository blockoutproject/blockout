package com.blockout.backend.notifications.api;

import com.blockout.backend.notifications.application.PushSubscriptionConflictException;
import com.blockout.backend.shared.http.HttpProblems;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Keeps association race diagnostics private, translating native uniqueness/version failures
 * without payload logging.
 */
@RestControllerAdvice(assignableTypes = PushSubscriptionsController.class)
@Order(0)
public class PushSubscriptionExceptionHandler {
  /**
   * Returns the ordinary conflict after the registration transaction has rolled back.
   *
   * @return canonical private refusal, retried only on a later ordinary registration occasion
   */
  @ExceptionHandler({
    PushSubscriptionConflictException.class,
    DataIntegrityViolationException.class,
    ObjectOptimisticLockingFailureException.class
  })
  ResponseEntity<Object> conflict() {
    return HttpProblems.response(HttpStatus.CONFLICT, "urn:blockout:problem:conflict");
  }
}
