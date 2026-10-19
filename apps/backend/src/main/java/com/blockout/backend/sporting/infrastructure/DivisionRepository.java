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
   * Reads list metadata and image presence using database case folding and UUID ordering.
   *
   * @param includeInactive whether inactive entries are included
   * @return matching configured divisions without their stored image bytes
   */
  @Query(
      """
      select d.id as id, d.revision as revision, d.name as name, d.color as color,
          d.gradientStart as gradientStart, d.gradientMiddle as gradientMiddle,
          d.gradientEnd as gradientEnd,
          case when d.logo is not null then true else false end as hasLogo, d.active as active
      from DivisionEntity d
      where :includeInactive = true or d.active = true
      order by lower(d.name), d.id
      """)
  List<DivisionSummary> findConfigured(boolean includeInactive);
}
