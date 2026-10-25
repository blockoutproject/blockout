package com.blockout.backend.access.api;

import com.blockout.backend.access.domain.AccessSettingsUnavailableException;
import com.blockout.backend.access.domain.InvalidAccessSettingsException;
import com.blockout.backend.access.domain.StaleSettingsRevisionException;
import com.blockout.backend.shared.http.HttpProblems;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.TransactionException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Translates settings-owned refusals; framework failures retain their shared HTTP owner. */
@RestControllerAdvice(assignableTypes = AdministrationSettingsController.class)
@Order(0)
@Slf4j
public class AccessSettingsExceptionHandler {

  /** Treats both the submitted-revision and JPA commit-time failures as the canonical 409. */
  @ExceptionHandler({StaleSettingsRevisionException.class, OptimisticLockingFailureException.class})
  ResponseEntity<Object> stale() {
    return HttpProblems.response(HttpStatus.CONFLICT, "urn:blockout:problem:stale-revision");
  }

  /** Refuses an invalid resulting group without exposing entered text, URLs or stored values. */
  @ExceptionHandler(InvalidAccessSettingsException.class)
  ResponseEntity<Object> invalid() {
    return HttpProblems.response(
        HttpStatus.UNPROCESSABLE_CONTENT, "urn:blockout:problem:unprocessable-content");
  }

  /**
   * Records one bounded diagnostic while keeping unavailable settings opaque and fail-closed.
   *
   * @param exception absorbed configuration, database or transaction failure; no payload is logged
   * @return the canonical non-cacheable unavailable problem
   */
  @ExceptionHandler({
    AccessSettingsUnavailableException.class,
    DataAccessException.class,
    TransactionException.class
  })
  ResponseEntity<Object> unavailable(Exception exception) {
    String reason =
        switch (exception) {
          case AccessSettingsUnavailableException _ -> "configuration_unavailable";
          case DataAccessException _ -> "database_unavailable";
          default -> "transaction_failed";
        };
    log.atError()
        .addKeyValue("operation", "access_settings")
        .addKeyValue("outcome", "failed")
        .addKeyValue("reason", reason)
        .log("Access settings unavailable");
    return HttpProblems.response(
        HttpStatus.SERVICE_UNAVAILABLE, "urn:blockout:problem:unavailable");
  }
}
