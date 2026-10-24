package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
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
   * Projects immutable season identity without caching lifecycle before a later write lock.
   *
   * @param year explicit qualified year
   * @return existing canonical season identity
   */
  Optional<SeasonView> findByStartYear(long year);

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
