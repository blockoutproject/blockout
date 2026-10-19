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
  @Query("SELECT d FROM DivisionEntity d WHERE d.id = :id")
  Optional<DivisionEntity> lockById(UUID id);

  /**
   * Reads list metadata and image presence using database case folding and UUID ordering.
   *
   * @param includeInactive whether inactive entries are included
   * @return matching configured divisions without their stored image bytes
   */
  @Query(
      """
      SELECT d.id AS id, d.revision AS revision, d.name AS name, d.color AS color,
          d.gradientStart AS gradientStart, d.gradientMiddle AS gradientMiddle,
          d.gradientEnd AS gradientEnd,
          CASE WHEN d.logo IS NOT NULL THEN TRUE ELSE FALSE END AS hasLogo, d.active AS active
      FROM DivisionEntity d
      WHERE :includeInactive = TRUE OR d.active = TRUE
      ORDER BY LOWER(d.name), d.id
      """)
  List<DivisionSummary> findConfigured(boolean includeInactive);
}
