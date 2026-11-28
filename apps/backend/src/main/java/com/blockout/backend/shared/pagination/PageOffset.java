package com.blockout.backend.shared.pagination;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Bounds page indexes for JPA, whose starting row offset is a signed 32-bit integer. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class PageOffset {
  /**
   * Bounds a zero-based page before multiplying it by the page size.
   *
   * @param size validated positive page size
   * @return largest page whose starting offset fits in an int
   */
  public static int maxPage(int size) {
    return Integer.MAX_VALUE / size;
  }
}
