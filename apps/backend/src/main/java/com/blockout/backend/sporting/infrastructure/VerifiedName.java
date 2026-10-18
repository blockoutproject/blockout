package com.blockout.backend.sporting.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.UUID;

/**
 * Explicit current alias on an owner, qualified by season/organizer/competition; no name history.
 */
@Embeddable
public class VerifiedName {
  @Column(nullable = false)
  private UUID seasonId;

  @Column(nullable = false)
  private String organizerReference;

  @Column(nullable = false)
  private String competitionReference;

  @Column(nullable = false)
  private String comparisonName;

  /** Allows Hibernate to read technically maintained scoped associations. */
  protected VerifiedName() {}
}
