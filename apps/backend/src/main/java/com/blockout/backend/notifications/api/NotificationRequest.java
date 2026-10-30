package com.blockout.backend.notifications.api;

import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.generated.mobile.model.MarkNotificationReadRequest;
import com.blockout.backend.notifications.application.NotificationContext;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
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
   * @throws ResponseStatusException for a foreign UUID (404); storage outages retain their shared
   *     HTTP owner
   */
  public NotificationContext owner(UUID original) {
    UUID current = account.id();
    if (!current.equals(original)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    return new NotificationContext(current);
  }

  /**
   * Enforces the true-only boolean enum missing from Java's generated Bean Validation annotations.
   * Required/null/type checks remain with the generated DTO and configured HTTP mapper.
   *
   * @param body validated generated read document
   * @throws ResponseStatusException with status 400 for unsupported false intent
   */
  public void requireRead(MarkNotificationReadRequest body) {
    if (!Boolean.TRUE.equals(body.getRead()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  }
}
