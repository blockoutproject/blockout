package com.blockout.backend.shared.pagination;

import java.util.List;

/** An immutable zero-based page with continuation and no total-count query. */
public record OffsetPage<T>(List<T> items, long page, boolean hasNext) {
  public OffsetPage {
    items = List.copyOf(items);
  }

  public static <T> OffsetPage<T> empty(long page) {
    return new OffsetPage<>(List.of(), page, false);
  }
}
