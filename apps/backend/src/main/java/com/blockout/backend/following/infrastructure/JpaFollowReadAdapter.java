package com.blockout.backend.following.infrastructure;

import com.blockout.backend.following.application.FollowReadStore;
import com.blockout.backend.sporting.infrastructure.SportingVisibilityPredicates;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/** Composes scalar season/follow projections in JPA without hydrating another owner's entities. */
@Repository
@RequiredArgsConstructor
public class JpaFollowReadAdapter implements FollowReadStore {
  private static final String FOLLOWED_POOL =
      "EXISTS (SELECT f.id FROM PoolFollowEntity f JOIN PoolEntity p ON p.id = f.poolId WHERE f.accountId = :accountId AND p.season = s AND "
          + SportingVisibilityPredicates.POOL
          + ")";
  private static final String FOLLOWED_TEAM =
      "EXISTS (SELECT f.id FROM TeamFollowEntity f JOIN TeamEntity t ON t.id = f.teamId WHERE f.accountId = :accountId AND t.season = s AND "
          + SportingVisibilityPredicates.TEAM
          + ")";
  private final EntityManager entities;

  /** {@inheritDoc} */
  @Override
  public List<SeasonChoice> seasons(UUID accountId) {
    return entities
        .createQuery(
            "SELECT NEW com.blockout.backend.following.application.FollowReadStore$SeasonChoice(s.id, s.startYear, s.label, CASE WHEN "
                + FOLLOWED_POOL
                + " OR "
                + FOLLOWED_TEAM
                + " THEN TRUE ELSE FALSE END) FROM SeasonEntity s WHERE EXISTS (SELECT p.id FROM PoolEntity p WHERE p.season = s AND "
                + SportingVisibilityPredicates.POOL
                + ") OR "
                + FOLLOWED_TEAM
                + " ORDER BY s.startYear DESC, s.id ASC",
            SeasonChoice.class)
        .setParameter("accountId", accountId)
        .getResultList();
  }
}
