package com.blockout.backend.following.api;

import com.blockout.backend.following.application.FollowUnavailableTargetException;
import com.blockout.backend.shared.http.HttpProblems;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Following-owned refusals; unexpected failures retain the shared HTTP owner. */
@RestControllerAdvice
@Order(0)
public class FollowingExceptionHandler {
  /** Hides unavailable sporting targets without exposing their identity. */
  @ExceptionHandler(FollowUnavailableTargetException.class)
  ResponseEntity<Object> notFound() {
    return HttpProblems.response(HttpStatus.NOT_FOUND, "urn:blockout:problem:not-found");
  }
}
