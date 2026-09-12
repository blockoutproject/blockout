package com.blockout.backend.jobs.application;

import java.util.UUID;

/**
 * Expected publication outcomes; the owner decides whether a rejection rolls back its transaction.
 */
public sealed interface PublicationResult {
  /** A new or identical existing publication, sharing the same durable identity. */
  record Accepted(UUID id) implements PublicationResult {}

  /**
   * The type/key already exists with a different payload or version; no existing work is changed.
   */
  record Conflict() implements PublicationResult {}

  /** A bounded safe code, never the rejected key or payload. */
  record Rejected(String code) implements PublicationResult {}
}
