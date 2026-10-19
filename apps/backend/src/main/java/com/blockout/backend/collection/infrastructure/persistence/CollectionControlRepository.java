package com.blockout.backend.collection.infrastructure.persistence;

import com.blockout.backend.collection.application.model.CollectionState;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

/** One current control per seasonal provider or seasonless family. */
interface CollectionControlRepository extends JpaRepository<CollectionControlEntity, UUID> {
  /**
   * Resolves the immutable season without loading mutable state.
   *
   * @param id immutable owner identity
   * @return scalar season reference without loading a managed aggregate
   */
  @Query(
      "select new com.blockout.backend.collection.application.model.CollectionState$SeasonScope(c.seasonId) from CollectionControlEntity c where c.id = :id")
  Optional<CollectionState.SeasonScope> seasonScope(UUID id);

  /**
   * Holds the current control through admission commit.
   *
   * @param id control whose canonical season is already locked
   * @return current control held through admission
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select c from CollectionControlEntity c where c.id = :id")
  Optional<CollectionControlEntity> lockById(UUID id);

  /**
   * Lists finite current configuration in identity order.
   *
   * @return complete finite control configuration in stable identity order
   */
  List<CollectionControlEntity> findAllByOrderById();

  /**
   * Advances actual freshness without changing an operator's editing revision.
   *
   * @param id admitted control
   * @param attemptedAt actual acquisition completion
   */
  @Modifying
  @Query(
      value =
          "UPDATE collection_control SET last_attempt_at = GREATEST(last_attempt_at, :attemptedAt) WHERE id = :id",
      nativeQuery = true)
  void recordAttempt(UUID id, Instant attemptedAt);

  /**
   * Records fully evidenced passage success without an editor conflict.
   *
   * @param id admitted control
   * @param completedAt actual completed successful passage
   */
  @Modifying
  @Query(
      value = "UPDATE collection_control SET last_success_at = :completedAt WHERE id = :id",
      nativeQuery = true)
  void recordSuccess(UUID id, Instant completedAt);
}
