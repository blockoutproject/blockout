package com.blockout.backend.collection.infrastructure.persistence;

import com.blockout.backend.collection.application.CollectionAttempt;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/**
 * Bounded current acquisition evidence reads; integration success never substitutes for an attempt.
 */
interface CollectionResultRepository
    extends JpaRepository<CollectionResultEntity, CollectionResultEntity.Key> {
  /**
   * Reads actual acquisition evidence independently from integration outcomes.
   *
   * @param controlId independent family
   * @param scopeIds bounded batch of candidate identities
   * @return current actual acquisition attempts and usable observations
   */
  @Query(
      "select new com.blockout.backend.collection.application.CollectionAttempt(r.scopeId, r.stage, r.lastAttemptAt, r.lastSuccessAt) from CollectionResultEntity r where r.controlId = :controlId and r.scopeId in :scopeIds and r.phase = com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum.ACQUISITION")
  List<CollectionAttempt> attempts(UUID controlId, List<UUID> scopeIds);
}
