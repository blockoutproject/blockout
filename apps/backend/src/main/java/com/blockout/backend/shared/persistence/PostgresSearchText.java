package com.blockout.backend.shared.persistence;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Compile-time SQL fragments for literal, case- and accent-folded PostgreSQL term matching. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class PostgresSearchText {
  public static final String FOLD_PREFIX = "regexp_replace(LOWER(normalize(";
  public static final String FOLD_SUFFIX = ", NFD)) COLLATE \"C\", U&'[\\0300-\\036f]', '', 'g')";

  /** Splits the optional {@code :query} parameter into nonempty literal terms. */
  public static final String QUERY_TERMS_CTE =
      """
      WITH terms AS (
        SELECT value FROM regexp_split_to_table(
      """
          + FOLD_PREFIX
          + "CAST(:query AS TEXT)"
          + FOLD_SUFFIX
          + """
        COLLATE "default", '[^[:alnum:]]+') AS term(value)
        WHERE value <> ''
      )
      """;
}
