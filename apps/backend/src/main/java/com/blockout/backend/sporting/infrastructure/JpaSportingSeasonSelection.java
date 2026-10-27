package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.sporting.application.SportingSeasonSelection;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.util.UUID;
import org.springframework.stereotype.Repository;

/**
 * Keeps canonical season relationships and current target eligibility inside sporting persistence.
 */
@Repository
class JpaSportingSeasonSelection implements SportingSeasonSelection {
  /** {@inheritDoc} */
  @Override
  public Season select(CriteriaQuery<?> query, CriteriaBuilder builder) {
    Root<SeasonEntity> season = query.from(SeasonEntity.class);
    Subquery<UUID> pools = query.subquery(UUID.class);
    Root<PoolEntity> pool = pools.from(PoolEntity.class);
    pools
        .select(pool.get("id"))
        .where(
            builder.equal(pool.get("season"), season),
            SportingVisibilityPredicates.pool(pool, builder));
    Subquery<UUID> teams = query.subquery(UUID.class);
    Root<TeamEntity> team = teams.from(TeamEntity.class);
    teams
        .select(team.get("id"))
        .where(
            builder.equal(team.get("season"), season),
            SportingVisibilityPredicates.team(teams, team, builder));
    return new Season(season.get("id"), season.get("startYear"), season.get("label"), pools, teams);
  }
}
