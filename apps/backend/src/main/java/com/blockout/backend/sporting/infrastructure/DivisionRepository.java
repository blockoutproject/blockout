package com.blockout.backend.sporting.infrastructure;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

/** Native Spring Data access to the sporting division owner. */
interface DivisionRepository extends JpaRepository<DivisionEntity, UUID> {
  /**
   * Holds activity stable through classification or lifecycle commit.
   *
   * @param id target division
   * @return current managed owner under a write lock, or empty
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select d from DivisionEntity d where d.id = :id")
  Optional<DivisionEntity> lockById(UUID id);

  /**
   * Orders the bounded configuration list using database case folding and UUID ordering.
   *
   * @param includeInactive whether inactive entries are included
   * @return matching configured divisions
   */
  @Query(
      "select d from DivisionEntity d where :includeInactive = true or d.active = true order by lower(d.name), d.id")
  List<DivisionEntity> findConfigured(boolean includeInactive);
}
