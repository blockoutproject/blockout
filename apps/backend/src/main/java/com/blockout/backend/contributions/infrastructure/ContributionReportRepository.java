package com.blockout.backend.contributions.infrastructure;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Report existence and all-row totals; anonymous facts remain independently counted. */
interface ContributionReportRepository extends JpaRepository<ContributionReportEntity, UUID> {
  /**
   * Reads only the original caller's reporting state, without hydrating its private reason.
   *
   * @param versionId exact retained version
   * @param reporterId original usable identity
   * @return whether this original account already reported this version
   */
  boolean existsByVersionIdAndReporterId(UUID versionId, UUID reporterId);

  /**
   * Counts all retained facts, including distinct rows with erased attribution.
   *
   * @param versionId exact retained version
   * @return total independent of reporter nullability
   */
  long countByVersionId(UUID versionId);
}
