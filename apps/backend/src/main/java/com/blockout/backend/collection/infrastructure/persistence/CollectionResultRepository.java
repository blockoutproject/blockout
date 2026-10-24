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
   * @return current actual acquisition attempts, outcomes, logical tokens and usable observations
   */
  @Query(
      "SELECT NEW com.blockout.backend.collection.application.model.CollectionAttempt(r.scopeId, r.stage, r.lastAttemptAt, r.lastSuccessAt, r.outcome, r.cycleOrder, r.readOrdinal) FROM CollectionResultEntity r WHERE r.controlId = :controlId AND r.scopeId IN :scopeIds AND r.phase = com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum.ACQUISITION")
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
   * The known control keeps evidence lookups within the leading key of the current-result index.
   * Hibernate compares target kinds and stages through their shared string enum mapping.
   *
   * @param controlId immutable owner of the retained cycle
   * @param cycleId frozen nonempty selection
   * @param cycleOrder current logical passage
   * @return true only when no selected role is missing and no current result failed
   */
  @Query(
      """
      SELECT CASE WHEN COUNT(c) > 0 THEN TRUE ELSE FALSE END
      FROM CollectionCycleEntity c
      WHERE c.id = :cycleId AND c.controlId = :controlId
        AND EXISTS (SELECT 1 FROM CollectionTargetEntity t WHERE t.cycleId = c.id)
        AND NOT EXISTS (SELECT 1 FROM CollectionResultEntity r
          WHERE r.controlId = :controlId AND r.cycleOrder = :cycleOrder
            AND r.outcome <> CollectionOutcomeEnum.SUCCESS)
        AND NOT EXISTS (
          SELECT 1 FROM CollectionTargetEntity t WHERE t.cycleId = c.id AND (
            NOT EXISTS (SELECT 1 FROM CollectionResultEntity r
              WHERE r.controlId = :controlId AND r.cycleOrder = :cycleOrder
              AND r.scopeId = t.scopeId AND r.stage = t.kind
              AND r.phase = CollectionPhaseEnum.ACQUISITION AND r.outcome = CollectionOutcomeEnum.SUCCESS)
            OR NOT EXISTS (SELECT 1 FROM CollectionResultEntity r
              WHERE r.controlId = :controlId AND r.cycleOrder = :cycleOrder
              AND r.scopeId = t.scopeId AND r.stage = t.kind
              AND r.phase = CollectionPhaseEnum.INTEGRATION AND r.outcome = CollectionOutcomeEnum.SUCCESS)))
      """)
  boolean successful(UUID controlId, UUID cycleId, long cycleOrder);
}
