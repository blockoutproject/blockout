package com.blockout.backend.sports.administration.application;

import java.util.List;

/** Bounded deterministic reference-data page with no costly exact-count promise. */
public record SportsSlice<T>(List<T> items, int page, int pageSize, boolean hasNext) {
  /**
   * Removes the look-ahead row used to determine continuation.
   *
   * @param rows ordered query output containing at most pageSize + 1 rows
   * @param page zero-based page
   * @param pageSize validated page capacity
   * @return immutable visible rows and continuation metadata
   */
  public static <T> SportsSlice<T> from(List<T> rows, int page, int pageSize) {
    return new SportsSlice<>(
        List.copyOf(rows.subList(0, Math.min(rows.size(), pageSize))),
        page,
        pageSize,
        rows.size() > pageSize);
  }
}
