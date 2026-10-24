package com.blockout.backend.sporting.infrastructure;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

/** Native persistence of the pool's current publication evidence and owned table. */
interface StandingsRepository extends JpaRepository<StandingsEntity, UUID> {
  /**
   * Loads the ordered rows and their statistics together, without one statistics read per row.
   * Columns remain a separate collection read to avoid multiplying rows by columns.
   *
   * @param poolId known publication scope
   * @return retained publication and table, or empty before the first acceptance
   */
  @Override
  @EntityGraph(attributePaths = {"rows", "rows.statistics"})
  Optional<StandingsEntity> findById(UUID poolId);
}
