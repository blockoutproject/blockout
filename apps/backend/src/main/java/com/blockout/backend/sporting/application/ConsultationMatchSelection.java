package com.blockout.backend.sporting.application;

import jakarta.persistence.criteria.CommonAbstractCriteria;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Subquery;
import java.util.UUID;

/** Owner-controlled database selection for consumers that must filter before paging/counting. */
public interface ConsultationMatchSelection {
  /**
   * Composes current public match eligibility into a consumer's native Criteria query. Only scalar
   * identities cross this boundary; sporting entities and repositories remain private.
   *
   * @param query consuming database selection
   * @param builder native JPA criteria builder
   * @return subquery of currently viewable dated match identities, with no materialized ID list
   */
  Subquery<UUID> visibleIds(CommonAbstractCriteria query, CriteriaBuilder builder);
}
