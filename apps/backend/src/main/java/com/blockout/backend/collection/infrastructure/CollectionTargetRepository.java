package com.blockout.backend.collection.infrastructure;

import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;

/** Stable database pagination of immutable acquisition snapshots. */
interface CollectionTargetRepository
    extends JpaRepository<CollectionTargetEntity, CollectionTargetEntity.Key> {
  /**
   * Pages stable snapshot membership without a total count.
   *
   * @param cycleId retained current cycle
   * @param page bounded requested page
   * @return stable kind/scope order without a count query
   */
  Slice<CollectionTargetEntity> findByCycleIdOrderByKindAscScopeIdAsc(UUID cycleId, Pageable page);

  /**
   * Checks stable domain identity membership.
   *
   * @param cycleId current authorized cycle
   * @param scopeId domain identity
   * @return membership in the admitted snapshot
   */
  boolean existsByCycleIdAndScopeId(UUID cycleId, UUID scopeId);
}
