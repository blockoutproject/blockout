package com.blockout.backend.identity.user.domain;

import java.util.Locale;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Preserves initial email-prefix naming without treating that attribute as identity. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class InitialPseudonym {
  /**
   * Builds a normalized pseudonym of at most thirty characters. Candidates use the email prefix,
   * numbered collision suffixes, then a UUID-derived suffix.
   *
   * @param email nullable provider email; an absent prefix falls back to user
   * @param attempt owner collision attempt: zero initially, up to two hundred
   * @param id new profile identity used for the final fallback
   * @return a deterministic candidate whose uniqueness must be checked by persistence
   */
  public static String candidate(String email, int attempt, UUID id) {
    String raw =
        email != null && email.contains("@") ? email.substring(0, email.indexOf('@')) : "user";
    String base =
        raw.trim()
            .toLowerCase(Locale.ROOT)
            .replaceAll("\\s+", "-")
            .replaceAll("[^a-z0-9._-]", "-")
            .replaceAll("-{2,}", "-")
            .replaceAll("(^-+)|(-+$)", "");
    if (base.isBlank()) base = "user";
    String suffix;
    if (attempt == 0) suffix = "";
    else if (attempt < 200) suffix = "-" + (attempt + 1);
    else suffix = "-" + id.toString().replace("-", "").substring(0, 20);
    int max = 30 - suffix.length();
    if (base.length() > max) base = base.substring(0, max).replaceAll("-+$", "");
    if (base.isBlank()) base = "user";
    return base + suffix;
  }
}
