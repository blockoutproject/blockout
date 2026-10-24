package com.blockout.backend.collection.infrastructure.persistence;

import com.blockout.backend.collection.application.model.CollectionState;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

/**
 * Current contexts only; the native sequence supplies logical order independent of arrival time.
 */
interface CollectionCycleRepository extends JpaRepository<CollectionCycleEntity, Long> {
  /**
   * Resolves cycle owners before acquiring the runtime fence.
   *
   * @param id immutable cycle identity
   * @return scalar owner references before locks are acquired
   */
  @Query(
      "SELECT NEW com.blockout.backend.collection.application.model.CollectionState$CycleScope(c.incarnationId, c.controlId, c.sourceBindingId) FROM CollectionCycleEntity c WHERE c.id = :id")
  Optional<CollectionState.CycleScope> scope(UUID id);

  /**
   * Holds completion stable through the caller transaction.
   *
   * @param id cycle after its runtime and season locks
   * @return current completion state held through the caller transaction
   */
  @Lock(LockModeType.PESSIMISTIC_READ)
  @Query("SELECT c FROM CollectionCycleEntity c WHERE c.id = :id")
  Optional<CollectionCycleEntity> lockById(UUID id);

  /**
   * Serializes evidence recording with terminal completion.
   *
   * @param id cycle after runtime and season locks
   * @return context held exclusively through commit
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT c FROM CollectionCycleEntity c WHERE c.id = :id")
  Optional<CollectionCycleEntity> lockForUpdate(UUID id);

  /**
   * Reads a retained cycle by its external UUID.
   *
   * @param id externally stable cycle UUID
   * @return retained current context
   */
  Optional<CollectionCycleEntity> findById(UUID id);

  /**
   * Reads retained contexts for a configuration list in one query.
   *
   * @param ids externally stable cycle UUIDs
   * @return existing contexts only; callers restore their configuration order by identity
   */
  List<CollectionCycleEntity> findByIdIn(List<UUID> ids);

  /**
   * Deletes superseded context by its external UUID.
   *
   * @param id superseded context; no sporting fact or result is deleted
   */
  void deleteById(UUID id);
}
