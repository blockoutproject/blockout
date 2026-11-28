package com.blockout.backend.notifications.domain;

import java.time.Duration;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * One elapsed-age limit for authorized consultation, mutation and physical personal-row cleanup.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class NotificationRetention {
  /** At this elapsed age entries stop being consultable, independently of physical cleanup. */
  public static final Duration RETENTION = Duration.ofDays(29);
}
