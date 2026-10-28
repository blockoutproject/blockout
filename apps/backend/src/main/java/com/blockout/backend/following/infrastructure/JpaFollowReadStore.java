package com.blockout.backend.following.infrastructure;

import com.blockout.backend.following.application.FollowReadStore;
import com.blockout.backend.sporting.application.ConsultationMatchSelection;
import com.blockout.backend.sporting.application.SportingSeasonSelection;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/** Composes scalar season/follow projections in JPA without hydrating another owner's entities. */
@Repository
@RequiredArgsConstructor
public class JpaFollowReadStore implements FollowReadStore {
  private final EntityManager entities;
  private final SportingSeasonSelection sporting;

  /** {@inheritDoc} */
  @Override
  public ConsultationMatchSelection.Filter calendarSelection(UUID accountId, UUID seasonId) {
    return (query, builder, match) -> {
      Subquery<UUID> teamFollows = query.subquery(UUID.class);
      Root<TeamFollowEntity> team = teamFollows.from(TeamFollowEntity.class);
      teamFollows
          .select(team.get("id"))
          .where(
              builder.equal(team.get("accountId"), accountId),
              builder.or(
                  builder.equal(team.get("teamId"), match.homeTeamId()),
                  builder.equal(team.get("teamId"), match.awayTeamId())));
      Subquery<UUID> poolFollows = query.subquery(UUID.class);
      Root<PoolFollowEntity> pool = poolFollows.from(PoolFollowEntity.class);
      poolFollows
          .select(pool.get("id"))
          .where(
              builder.equal(pool.get("accountId"), accountId),
              builder.equal(pool.get("poolId"), match.poolId()));
      Predicate followed = builder.or(builder.exists(teamFollows), builder.exists(poolFollows));
      return seasonId == null
          ? followed
          : builder.and(followed, builder.equal(match.seasonId(), seasonId));
    };
  }

  /** {@inheritDoc} */
  @Override
  public List<SeasonChoice> seasons(UUID accountId) {
    CriteriaBuilder builder = entities.getCriteriaBuilder();
    CriteriaQuery<SeasonChoice> query = builder.createQuery(SeasonChoice.class);
    SportingSeasonSelection.Season season = sporting.select(query, builder);
    Subquery<UUID> poolFollows = query.subquery(UUID.class);
    Root<PoolFollowEntity> poolFollow = poolFollows.from(PoolFollowEntity.class);
    poolFollows
        .select(poolFollow.get("id"))
        .where(
            builder.equal(poolFollow.get("accountId"), accountId),
            poolFollow.get("poolId").in(season.pools()));
    Subquery<UUID> teamFollows = query.subquery(UUID.class);
    Root<TeamFollowEntity> teamFollow = teamFollows.from(TeamFollowEntity.class);
    teamFollows
        .select(teamFollow.get("id"))
        .where(
            builder.equal(teamFollow.get("accountId"), accountId),
            teamFollow.get("teamId").in(season.teams()));
    Predicate followedTeam = builder.exists(teamFollows);
    query
        .select(
            builder.construct(
                SeasonChoice.class,
                season.id(),
                season.startYear(),
                season.label(),
                builder
                    .<Boolean>selectCase()
                    .when(builder.or(builder.exists(poolFollows), followedTeam), true)
                    .otherwise(false)))
        .where(builder.or(builder.exists(season.pools()), followedTeam))
        .orderBy(builder.desc(season.startYear()), builder.asc(season.id()));
    return entities.createQuery(query).getResultList();
  }
}
