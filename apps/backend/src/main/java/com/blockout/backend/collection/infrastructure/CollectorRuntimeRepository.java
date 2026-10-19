package com.blockout.backend.collection.infrastructure;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

/** The seeded environment row is the native shared/exclusive transaction fence. */
interface CollectorRuntimeRepository extends JpaRepository<CollectorRuntimeEntity, Integer> {
  /**
   * Retains the shared fence through the caller transaction.
   *
   * @return current incarnation locked through the caller's domain commit
   */
  @Lock(LockModeType.PESSIMISTIC_READ)
  @Query("select r from CollectorRuntimeEntity r where r.id = 1")
  CollectorRuntimeEntity lockCurrent();

  /**
   * Excludes admitted writes until replacement commits.
   *
   * @return exclusive registration after all previously admitted shared holders commit
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select r from CollectorRuntimeEntity r where r.id = 1")
  CollectorRuntimeEntity lockForReplacement();
}
