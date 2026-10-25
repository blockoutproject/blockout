package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.exception.CollectionConflictException;

/** Safe wire revision bounds and stale desired-state decisions for collection. */
@lombok.NoArgsConstructor(access = lombok.AccessLevel.PRIVATE)
public class CollectionRevision {
  static final long MAX_SAFE_INTEGER = 9_007_199_254_740_991L;

  /**
   * Refuses a stale desired-state command, including a matching no-op.
   *
   * @param expected revision captured by the caller
   * @param actual current locked revision
   */
  static void requireRevision(long expected, long actual) {
    if (expected != actual) throw new CollectionConflictException("stale-revision");
  }

  /**
   * Rejects revisions that cannot advance within the shared safe range.
   *
   * @param revision current nonnegative wire revision
   */
  static void requireAdvance(long revision) {
    if (revision < 0 || revision >= MAX_SAFE_INTEGER)
      throw new CollectionConflictException("conflict");
  }
}
