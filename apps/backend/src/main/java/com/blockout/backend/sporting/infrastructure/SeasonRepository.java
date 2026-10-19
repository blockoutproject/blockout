package com.blockout.backend.sporting.infrastructure;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

/** Native Spring Data access to the sporting season owner. */
interface SeasonRepository extends JpaRepository<SeasonEntity, UUID> {
  /**
   * Lists the finite season configuration in canonical newest-first order.
   *
   * @return seasons ordered by descending start year and identity
   */
  List<SeasonEntity> findAllByOrderByStartYearDescIdAsc();

  /**
   * Finds the canonical season by its explicitly qualified year.
   *
   * @param year explicit qualified year
   * @return existing canonical season
   */
  Optional<SeasonEntity> findByStartYear(long year);

  /**
   * Acquires the native pessimistic season row lock.
   *
   * @param id canonical season to lock
   * @return locked row
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT s FROM SeasonEntity s WHERE s.id = :id")
  Optional<SeasonEntity> lockById(UUID id);
}
