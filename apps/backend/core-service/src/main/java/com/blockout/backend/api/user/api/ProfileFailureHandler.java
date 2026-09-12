package com.blockout.backend.api.user.api;

import java.util.Arrays;
import java.util.concurrent.atomic.AtomicInteger;
import org.slf4j.*;
import org.springframework.dao.DataAccessException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

/** Stops unexpected persistence/provider diagnostics at the current-user HTTP boundary. */
@RestControllerAdvice(assignableTypes = CurrentUserController.class)
public final class ProfileFailureHandler {
  private static final Logger LOG = LoggerFactory.getLogger(ProfileFailureHandler.class);

  @ExceptionHandler(RuntimeException.class)
  ResponseEntity<ProblemDetail> unavailable(RuntimeException failure) {
    boolean dependency = failure instanceof DataAccessException;
    LOG.atError()
        .addKeyValue("event.action", "identity.profile.failed")
        .setCause(diagnostic(failure, new AtomicInteger(16)))
        .log("Profile operation failed");
    return CurrentUserController.problem(
        dependency ? 503 : 500, dependency ? "PROFILE_STORE_UNAVAILABLE" : "INTERNAL_ERROR");
  }

  /**
   * Bound the complete diagnostic graph and retain locations without exception messages or SQL
   * rows.
   */
  private static Throwable diagnostic(Throwable failure, AtomicInteger remaining) {
    if (failure == null || remaining.getAndDecrement() <= 0) return null;
    var safe =
        new Throwable(failure.getClass().getName(), diagnostic(failure.getCause(), remaining));
    safe.setStackTrace(
        Arrays.copyOf(failure.getStackTrace(), Math.min(100, failure.getStackTrace().length)));
    for (Throwable suppressed : Arrays.stream(failure.getSuppressed()).limit(4).toList()) {
      var child = diagnostic(suppressed, remaining);
      if (child != null) safe.addSuppressed(child);
    }
    return safe;
  }
}
