package com.blockout.backend.following.infrastructure;

import com.blockout.backend.following.application.FollowContext.TargetType;
import com.blockout.backend.following.application.FollowReadStore;
import com.blockout.backend.following.application.ReadFollowLists;
import com.blockout.backend.sporting.application.ConsultationMatchSelection;
import com.blockout.backend.sporting.application.SportingSeasonSelection;
import com.blockout.backend.sporting.application.SportingTargetSelection;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.hibernate.SessionFactory;
import org.hibernate.query.criteria.HibernateCriteriaBuilder;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;
import org.springframework.data.jpa.support.PageableUtils;
import org.springframework.stereotype.Repository;

/** Composes personal selections in JPA without hydrating another owner's entities. */
@Repository
@RequiredArgsConstructor
public class JpaFollowReadStore implements FollowReadStore {
  private final EntityManager entities;
  private final SportingSeasonSelection sporting;
  private final SportingTargetSelection targets;

  /** {@inheritDoc} */
  @Override
  public TargetPage targets(UUID accountId, TargetType type, UUID seasonId, long page) {
    HibernateCriteriaBuilder builder =
        entities.getEntityManagerFactory().unwrap(SessionFactory.class).getCriteriaBuilder();
    CriteriaQuery<UUID> query = builder.createQuery(UUID.class);
    SportingTargetSelection.Target target =
        targets.select(type == TargetType.TEAM ? Kind.TEAM : Kind.POOL, query, builder);
    Root<?> follow =
        type == TargetType.TEAM
            ? query.from(TeamFollowEntity.class)
            : query.from(PoolFollowEntity.class);
    Predicate selected =
        builder.and(
            target.visible(),
            builder.equal(follow.get("accountId"), accountId),
            builder.equal(follow.get(type == TargetType.TEAM ? "teamId" : "poolId"), target.id()));
    if (seasonId != null)
      selected = builder.and(selected, builder.equal(target.seasonId(), seasonId));
    query
        .select(target.id())
        .where(selected)
        .orderBy(
            builder.asc(builder.collate(target.name(), "\"fr-x-icu\"")), builder.asc(target.id()));
    PageRequest request = PageRequest.of(Math.toIntExact(page), ReadFollowLists.PAGE_SIZE);
    List<UUID> rows =
        entities
            .createQuery(query)
            .setFirstResult(PageableUtils.getOffsetAsInteger(request))
            .setMaxResults(request.getPageSize() + 1)
            .getResultList();
    Slice<UUID> slice =
        new SliceImpl<>(
            rows.subList(0, Math.min(rows.size(), request.getPageSize())),
            request,
            rows.size() > request.getPageSize());
    return new TargetPage(slice.getContent(), slice.hasNext());
  }

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
