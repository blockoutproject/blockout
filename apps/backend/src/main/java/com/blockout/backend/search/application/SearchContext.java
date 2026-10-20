package com.blockout.backend.search.application;

import com.blockout.backend.generated.mobile.model.SportFormatEnum;
import com.blockout.backend.generated.mobile.model.SportGenderEnum;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

/**
 * Immutable read selection. Empty normalized text selects examples; nonempty text selects
 * traversal. The bypass flag records admission supplied by F12; it never authorizes a request or
 * retains a session.
 *
 * @param resource searched resource kind
 * @param text request text; normalization changes whitespace/case, never F02 identities
 * @param seasonId optional season restriction
 * @param divisionId optional division restriction
 * @param format optional canonical sporting format
 * @param gender optional canonical sporting gender
 * @param maintenanceBypass admitted access context supplied by the shared owner
 */
public record SearchContext(
    Resource resource,
    String text,
    UUID seasonId,
    UUID divisionId,
    SportFormatEnum format,
    SportGenderEnum gender,
    boolean maintenanceBypass) {
  /** The three discovery collections; sporting options retain their narrower generated enum. */
  public enum Resource {
    CLUB,
    TEAM,
    POOL
  }

  /**
   * Normalizes only search text and rejects sporting filters on clubs.
   *
   * @param resource required collection kind
   * @param text original text, or null for examples
   * @param seasonId optional exact season identity
   * @param divisionId optional exact division identity
   * @param format optional canonical format
   * @param gender optional canonical gender
   * @param maintenanceBypass shared admission context, not a permission decision
   */
  public SearchContext {
    Objects.requireNonNull(resource);
    text = text == null ? "" : text.replaceAll("(?U)\\s+", " ").trim().toLowerCase(Locale.ROOT);
    if (resource == Resource.CLUB
        && (seasonId != null || divisionId != null || format != null || gender != null)) {
      throw new IllegalArgumentException("Clubs have no sporting filters");
    }
  }

  /** Returns whether this selection requests limited examples rather than textual traversal. */
  public boolean examples() {
    return text.isEmpty();
  }
}
