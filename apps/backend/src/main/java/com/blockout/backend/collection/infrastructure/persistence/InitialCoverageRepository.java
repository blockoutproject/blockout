package com.blockout.backend.collection.infrastructure.persistence;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
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
   * Reads still undecided rows at ordinary passage completion.
   *
   * @param cycleId original admitted cycle
   * @param status exact state requiring a terminal unavailable result
   * @param page bounded page; updating rows requires consuming the first page again
   * @return bounded outstanding report rows
   */
  Slice<InitialCoverageEntity> findByCycleIdAndStatus(
      UUID cycleId,
      com.blockout.backend.collection.application.model.InitialCoverage.Status status,
      Pageable page);
}
