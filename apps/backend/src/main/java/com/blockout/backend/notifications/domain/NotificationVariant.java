package com.blockout.backend.notifications.domain;

import java.util.UUID;

/** Persisted editorial choices shared by all four families; never changed by factual correction. */
public enum NotificationVariant {
  FIRST,
  SECOND,
  THIRD;

  /**
   * Chooses once from the immutable entry identity; devices use the persisted choice.
   *
   * @param notificationId newly allocated personal entry UUID
   * @return a repeatable finite editorial choice
   */
  public static NotificationVariant choose(UUID notificationId) {
    return values()[Math.floorMod(notificationId.hashCode(), values().length)];
  }
}
