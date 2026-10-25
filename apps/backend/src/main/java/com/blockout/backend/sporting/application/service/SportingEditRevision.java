package com.blockout.backend.sporting.application.service;

import com.blockout.backend.sporting.application.exception.SportingConflictException;
import java.util.List;

/** Canonical stale-edit decision for opaque sporting editor revisions. */
@lombok.NoArgsConstructor(access = lombok.AccessLevel.PRIVATE)
public class SportingEditRevision {

  /**
   * Rejects a stale desired-state edit before effects or a matching no-op.
   *
   * @param supplied revision captured by the editor
   * @param current current relevant owner state
   * @throws SportingConflictException when revisions differ
   */
  static void require(String supplied, String current) {
    if (!current.equals(supplied)) throw new SportingConflictException("stale-revision", List.of());
  }
}
