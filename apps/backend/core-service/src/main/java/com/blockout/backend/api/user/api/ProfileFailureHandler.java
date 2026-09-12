package com.blockout.backend.api.user.api;

import com.blockout.backend.logging.SafeDiagnostics;
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
        .setCause(SafeDiagnostics.snapshot(failure))
        .log("Profile operation failed");
    return CurrentUserController.problem(
        dependency ? 503 : 500, dependency ? "PROFILE_STORE_UNAVAILABLE" : "INTERNAL_ERROR");
  }
}
