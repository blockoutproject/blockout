package com.blockout.backend.collection.infrastructure;

import com.blockout.backend.collection.application.CollectionState;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
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
      "select new com.blockout.backend.collection.application.CollectionState$SeasonScope(c.seasonId) from CollectionControlEntity c where c.id = :id")
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
}
