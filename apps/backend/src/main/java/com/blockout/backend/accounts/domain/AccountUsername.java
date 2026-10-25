package com.blockout.backend.accounts.domain;

import java.util.UUID;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Canonical account username format shared by explicit edits and neutral first establishment. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class AccountUsername {
  public static final String FORMAT = "[A-Za-z0-9._-]{3,32}";

  /**
   * Produces a neutral format-valid candidate; PostgreSQL still settles concurrent uniqueness.
   *
   * @return a candidate containing no provider profile or identity information
   */
  public static String neutral() {
    return "Player_" + UUID.randomUUID().toString().replace("-", "").substring(0, 24);
  }
}
