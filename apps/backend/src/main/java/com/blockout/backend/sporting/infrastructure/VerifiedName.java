package com.blockout.backend.sporting.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Explicit current alias on an owner, qualified by season/organizer/competition; no name history.
 */
@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VerifiedName {
  @Column(nullable = false)
  private UUID seasonId;

  @Column(nullable = false)
  private String organizerReference;

  @Column(nullable = false)
  private String competitionReference;

  @Column(nullable = false)
  private String comparisonName;
}
