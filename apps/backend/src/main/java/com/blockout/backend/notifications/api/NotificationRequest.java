package com.blockout.backend.notifications.api;

import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.generated.mobile.model.MarkNotificationReadRequest;
import com.blockout.backend.notifications.application.NotificationContext;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.web.server.ResponseStatusException;

/** F07 binding beyond the generated Java request shapes. */
@Component
@RequiredArgsConstructor
public class NotificationRequest {
  private final CurrentAccount account;

  /**
   * Captures the exact usable F05 account after shared HTTP authentication and F12 admission. Later
   * use cases must recheck this original lifecycle under F05's lock before personal writes.
   *
   * @param original account UUID addressed by the request, never a device or destination identity
   * @return immutable original owner, with no credentials, grants or entitlement snapshot
   * @throws org.springframework.security.access.AccessDeniedException if no usable account exists
   * @throws ResponseStatusException for a foreign UUID (404) or unavailable owner storage (503)
   */
  public NotificationContext owner(UUID original) {
    try {
      UUID current = account.id();
      if (!current.equals(original)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
      return new NotificationContext(current);
    } catch (DataAccessResourceFailureException | CannotCreateTransactionException failure) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /**
   * Rejects undeclared query fields and repeated scalar cursors, which generated binding ignores.
   * Cursor structure/continuation validity belongs to the later inbox reader.
   *
   * @param request native request preserving repeated and unknown query values
   * @param collection whether this is the only operation permitting the cursor query parameter
   * @throws ResponseStatusException with status 400 for unsupported query intent
   */
  public void validateQuery(HttpServletRequest request, boolean collection) {
    for (String parameter : request.getParameterMap().keySet()) {
      if (!collection
          || !parameter.equals("cursor")
          || request.getParameterValues(parameter).length != 1)
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Enforces the true-only boolean enum missing from Java's generated Bean Validation annotations.
   * Required/null/type/unknown-field checks remain with the generated DTO and strict HTTP mapper.
   *
   * @param body validated generated read document
   * @throws ResponseStatusException with status 400 for unsupported false intent
   */
  public void requireRead(MarkNotificationReadRequest body) {
    if (!Boolean.TRUE.equals(body.getRead()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  }
}
