package com.blockout.backend.notifications.application;

import java.util.Objects;
import java.util.UUID;

/**
 * Captured original F05 account after admission; never authorizes a replacement lifecycle. This
 * value contains no principal, device identity or stored privilege. Consumers recheck current
 * ownership and coordinate personal writes with erasure through the original account lock.
 *
 * @param accountId required original business UUID
 */
public record NotificationContext(UUID accountId) {
  /**
   * Rejects absent ownership instead of representing a guest as a personal context.
   *
   * @param accountId required original business UUID
   */
  public NotificationContext {
    Objects.requireNonNull(accountId);
  }
}
