package com.blockout.backend.identity.user.domain;

import java.util.Locale;
import java.util.UUID;

/** Preserves initial email-prefix naming without treating that attribute as identity. */
public final class InitialPseudonym {
  private InitialPseudonym() {}

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
