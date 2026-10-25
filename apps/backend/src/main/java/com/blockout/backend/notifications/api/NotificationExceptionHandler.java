package com.blockout.backend.notifications.api;

import com.blockout.backend.notifications.application.NotificationNotFoundException;
import com.blockout.backend.shared.http.HttpProblems;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Canonical safe errors at the private inbox boundary, without storage or personal payloads. */
@RestControllerAdvice
@Order(0)
public class NotificationExceptionHandler {
  /**
   * Hides unavailable personal entries with the canonical error.
   *
   * @return canonical deliberately unavailable personal resource response
   */
  @ExceptionHandler(NotificationNotFoundException.class)
  ResponseEntity<Object> missing() {
    return HttpProblems.response(HttpStatus.NOT_FOUND, "urn:blockout:problem:not-found");
  }

  /**
   * Refuses a changed publication audience without replaying the owning command.
   *
   * @return conflict requiring a fresh read and explicit intent
   */
  @ExceptionHandler(
      com.blockout.backend.notifications.application.AnnouncementAudienceChangedException.class)
  ResponseEntity<Object> audienceChanged() {
    return HttpProblems.response(HttpStatus.CONFLICT, "urn:blockout:problem:conflict");
  }
}
