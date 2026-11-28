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

/** One account's exact pool relation; PostgreSQL owns its FK and pair uniqueness constraints. */
@Entity
@Table(name = "pool_follow")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class PoolFollowEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false, updatable = false)
  private UUID accountId;

  @Column(nullable = false, updatable = false)
  private UUID poolId;

  /**
   * Creates an original-owner relation with a newly generated persistence identity.
   *
   * @param accountId usable original account, locked by the caller
   * @param poolId exact currently viewable sporting identity
   */
  PoolFollowEntity(UUID accountId, UUID poolId) {
    this.accountId = accountId;
    this.poolId = poolId;
  }
}
