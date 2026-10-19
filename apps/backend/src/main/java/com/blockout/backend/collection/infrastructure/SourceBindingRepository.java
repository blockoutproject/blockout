package com.blockout.backend.collection.infrastructure;

import com.blockout.backend.collection.application.CollectionState;
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
      "select new com.blockout.backend.collection.application.CollectionState$SeasonScope(c.seasonId) from SourceBindingEntity c where c.id = :id")
  Optional<CollectionState.SeasonScope> seasonScope(UUID id);

  /**
   * Locks current candidate configuration.
   *
   * @param id source in the already locked canonical season
   * @return source held through admission
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from SourceBindingEntity s where s.id = :id")
  Optional<SourceBindingEntity> lockById(UUID id);

  /**
   * Lists the supported roots of one season.
   *
   * @param seasonId canonical season
   * @return its ordered preparation configuration
   */
  List<SourceBindingEntity> findBySeasonIdOrderById(UUID seasonId);

  /**
   * Reads pending validations that have no admitted context.
   *
   * @return only never-admitted pending requests, not obsolete interrupted validations
   */
  @Query(
      "select s from SourceBindingEntity s where s.validationState = com.blockout.backend.generated.ingestion.model.SourceValidationStateEnum.PENDING and s.currentCycleId is null order by s.id")
  List<SourceBindingEntity> pendingValidations();
}
