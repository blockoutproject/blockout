package com.blockout.backend.collection.infrastructure.persistence;

import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import java.util.List;
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
   * Checks the admitted role as well as its resource identity.
   *
   * @param cycleId current admitted context
   * @param scopeId stable resource
   * @param kind expected acquisition role
   * @return exact snapshot membership
   */
  boolean existsByCycleIdAndScopeIdAndKind(
      UUID cycleId, UUID scopeId, CollectionTargetKindEnum kind);

  /**
   * Checks all candidate parent identities in one existence query.
   *
   * @param cycleId current admitted context
   * @param scopeIds nonempty retained parent identities
   * @param kind expected acquisition role
   * @return whether any candidate has exact snapshot membership
   */
  boolean existsByCycleIdAndScopeIdInAndKind(
      UUID cycleId, List<UUID> scopeIds, CollectionTargetKindEnum kind);
}
