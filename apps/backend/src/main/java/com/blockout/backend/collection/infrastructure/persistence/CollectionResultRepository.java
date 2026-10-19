package com.blockout.backend.collection.infrastructure.persistence;

import com.blockout.backend.collection.application.model.CollectionAttempt;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
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
      "select new com.blockout.backend.collection.application.model.CollectionAttempt(r.scopeId, r.stage, r.lastAttemptAt, r.lastSuccessAt) from CollectionResultEntity r where r.controlId = :controlId and r.scopeId in :scopeIds and r.phase = com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum.ACQUISITION")
  List<CollectionAttempt> attempts(UUID controlId, List<UUID> scopeIds);

  /**
   * Pages current evidence in canonical order without counting all results.
   *
   * @param controlId independent owner
   * @param page bounded native page
   * @return current scope/stage/phase ordered slice
   */
  Slice<CollectionResultEntity> findByControlIdOrderByScopeIdAscStageAscPhaseAsc(
      UUID controlId, Pageable page);

  /**
   * Qualifies success from both phases of every selected target and any additional child results.
   *
   * @param cycleId frozen nonempty selection
   * @param cycleOrder current logical passage
   * @return true only when no selected role is missing and no current result failed
   */
  @Query(
      value =
          """
      SELECT EXISTS (SELECT 1 FROM collection_target t WHERE t.cycle_id = :cycleId)
        AND NOT EXISTS (SELECT 1 FROM collection_result r WHERE r.cycle_order = :cycleOrder AND r.outcome <> 'SUCCESS')
        AND NOT EXISTS (
          SELECT 1 FROM collection_target t WHERE t.cycle_id = :cycleId AND (
            NOT EXISTS (SELECT 1 FROM collection_result r WHERE r.cycle_order = :cycleOrder
              AND r.scope_id = t.scope_id AND r.stage = t.kind AND r.phase = 'ACQUISITION' AND r.outcome = 'SUCCESS')
            OR NOT EXISTS (SELECT 1 FROM collection_result r WHERE r.cycle_order = :cycleOrder
              AND r.scope_id = t.scope_id AND r.stage = t.kind AND r.phase = 'INTEGRATION' AND r.outcome = 'SUCCESS')))
      """,
      nativeQuery = true)
  boolean successful(UUID cycleId, long cycleOrder);
}
