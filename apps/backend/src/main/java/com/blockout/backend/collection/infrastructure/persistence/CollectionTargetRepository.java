package com.blockout.backend.collection.infrastructure.persistence;

import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import java.util.List;
import java.util.Optional;
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
   * Resolves one admitted parent across all candidate identities without per-pool queries.
   *
   * @param cycleId current admitted context
   * @param scopeIds nonempty retained parent identities
   * @param kind expected acquisition role
   * @return first exact snapshot membership in scope UUID order, or empty when none is admitted
   */
  Optional<CollectionTargetEntity> findFirstByCycleIdAndScopeIdInAndKindOrderByScopeIdAsc(
      UUID cycleId, List<UUID> scopeIds, CollectionTargetKindEnum kind);
}
