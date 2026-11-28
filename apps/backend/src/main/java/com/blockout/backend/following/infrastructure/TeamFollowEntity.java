package com.blockout.backend.following.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** One account's exact team relation; PostgreSQL owns its FK and pair uniqueness constraints. */
@Entity
@Table(name = "team_follow")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class TeamFollowEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false, updatable = false)
  private UUID accountId;

  @Column(nullable = false, updatable = false)
  private UUID teamId;

  /**
   * Creates an original-owner relation with a newly generated persistence identity.
   *
   * @param accountId usable original account, locked by the caller
   * @param teamId exact currently viewable sporting identity
   */
  TeamFollowEntity(UUID accountId, UUID teamId) {
    this.accountId = accountId;
    this.teamId = teamId;
  }
}
