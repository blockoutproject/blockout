package com.blockout.backend.collection.infrastructure.persistence;

import com.blockout.backend.collection.application.model.CollectionState;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

/** Current supported bindings; their immutable season identity is owned by F02. */
interface SourceBindingRepository extends JpaRepository<SourceBindingEntity, UUID> {
  /**
   * Resolves the canonical season without loading mutable state.
   *
   * @param id immutable owner identity
   * @return scalar season reference without loading a managed aggregate
   */
  @Query(
      "SELECT NEW com.blockout.backend.collection.application.model.CollectionState$SeasonScope(c.seasonId) FROM SourceBindingEntity c WHERE c.id = :id")
  Optional<CollectionState.SeasonScope> seasonScope(UUID id);

  /**
   * Locks current candidate configuration.
   *
   * @param id source in the already locked canonical season
   * @return source held through admission
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT s FROM SourceBindingEntity s WHERE s.id = :id")
  Optional<SourceBindingEntity> lockById(UUID id);

  /**
   * Lists the supported roots of one season.
   *
   * @param seasonId canonical season
   * @return its ordered preparation configuration
   */
  List<SourceBindingEntity> findBySeasonIdOrderByProviderAscOrganizerReferenceAscIdAsc(
      UUID seasonId);

  /**
   * Reads pending validations that have no admitted context.
   *
   * @return only never-admitted pending requests, not obsolete interrupted validations
   */
  @Query(
      "SELECT s FROM SourceBindingEntity s WHERE s.validationState = com.blockout.backend.generated.ingestion.model.SourceValidationStateEnum.PENDING AND s.currentCycleId IS NULL ORDER BY s.id")
  List<SourceBindingEntity> pendingValidations();
}
