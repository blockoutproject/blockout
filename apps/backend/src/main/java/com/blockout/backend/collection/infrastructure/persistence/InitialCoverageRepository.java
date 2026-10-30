package com.blockout.backend.collection.infrastructure.persistence;

import com.blockout.backend.collection.application.model.InitialCoverage;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

/** Bounded current reports selected through their canonical source-season owner. */
interface InitialCoverageRepository
    extends JpaRepository<InitialCoverageEntity, InitialCoverageEntity.Key> {
  /**
   * Reads current initial coverage without a total count or provider access.
   *
   * @param seasonId exact canonical season
   * @param page bounded native page
   * @return stable current report slice
   */
  @Query(
      "SELECT r FROM InitialCoverageEntity r JOIN SourceBindingEntity s ON s.id = r.sourceBindingId"
          + " WHERE s.seasonId = :seasonId ORDER BY r.sourceBindingId, r.scopeId, r.stage, r.phase")
  Slice<InitialCoverageEntity> coverage(UUID seasonId, Pageable page);

  /**
   * Reads only previously requested narrower scopes for retry validation.
   *
   * @param sourceIds explicitly selected roots
   * @param scopeIds explicitly selected scope identities
   * @return existing report rows; missing scope identities grant no retry authority
   */
  List<InitialCoverageEntity> findBySourceBindingIdInAndScopeIdIn(
      Set<UUID> sourceIds, Set<UUID> scopeIds);

  /**
   * Finishes undecided coverage in the enclosing cycle-completion transaction.
   *
   * @param cycleId original admitted cycle
   * @param requested state eligible for the terminal transition
   * @param unavailable terminal state for coverage without accepted evidence
   */
  @Modifying(flushAutomatically = true)
  @Query(
      "UPDATE InitialCoverageEntity r SET r.status = :unavailable"
          + " WHERE r.cycleId = :cycleId AND r.status = :requested")
  void finishRequested(
      UUID cycleId, InitialCoverage.Status requested, InitialCoverage.Status unavailable);
}
