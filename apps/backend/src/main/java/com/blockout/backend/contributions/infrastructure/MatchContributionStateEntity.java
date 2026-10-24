package com.blockout.backend.contributions.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Match-local editing state; the application match-lock owner advances its revision explicitly. */
@Entity
@Table(name = "contribution_state")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MatchContributionStateEntity {
  @Id
  @Column(nullable = false, updatable = false)
  private UUID matchId;

  @Setter(AccessLevel.PACKAGE)
  @Column(nullable = false)
  private long revision;

  @Setter(AccessLevel.PACKAGE)
  private UUID reportHoldVersionId;

  /**
   * Creates the first state only while the caller holds the existing F02 match lock.
   *
   * @param matchId existing match identity; absence on reads must not invoke this constructor
   */
  public MatchContributionStateEntity(UUID matchId) {
    this.matchId = matchId;
  }
}
