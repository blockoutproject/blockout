package com.blockout.backend.following.infrastructure;

import com.blockout.backend.following.application.FollowContext;
import com.blockout.backend.following.application.FollowContext.Target;
import com.blockout.backend.following.application.FollowContext.TargetType;
import com.blockout.backend.following.application.FollowStore;
import jakarta.persistence.EntityManager;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** JPA adapter for independent team/pool associations; never hydrates another owner's entities. */
@Repository
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
public class JpaFollowStore implements FollowStore {
  private final TeamFollowRepository teams;
  private final PoolFollowRepository pools;
  private final EntityManager entities;

  /** {@inheritDoc} */
  @Override
  public Optional<Relation> find(FollowContext context) {
    return switch (context.target().type()) {
      case TEAM ->
          teams
              .findByAccountIdAndTeamId(context.accountId(), context.target().id())
              .map(this::toRelation);
      case POOL ->
          pools
              .findByAccountIdAndPoolId(context.accountId(), context.target().id())
              .map(this::toRelation);
    };
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public void add(FollowContext context) {
    switch (context.target().type()) {
      case TEAM -> teams.save(new TeamFollowEntity(context.accountId(), context.target().id()));
      case POOL -> pools.save(new PoolFollowEntity(context.accountId(), context.target().id()));
    }
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public void remove(FollowContext context) {
    switch (context.target().type()) {
      case TEAM -> teams.deleteByAccountIdAndTeamId(context.accountId(), context.target().id());
      case POOL -> pools.deleteByAccountIdAndPoolId(context.accountId(), context.target().id());
    }
  }

  /** {@inheritDoc} */
  @Override
  public List<Relation> relations(Set<Target> targets) {
    Set<UUID> teamIds = new HashSet<>();
    Set<UUID> poolIds = new HashSet<>();
    for (Target target : targets) {
      switch (target.type()) {
        case TEAM -> teamIds.add(target.id());
        case POOL -> poolIds.add(target.id());
      }
    }
    if (targets.isEmpty()) return List.of();
    // Both origins share the PostgreSQL statement snapshot, including during account-lock relookup.
    return List.copyOf(
        entities
            .createQuery(
                """
        SELECT NEW com.blockout.backend.following.application.FollowStore$Relation(
          t.id, t.accountId, NEW com.blockout.backend.following.application.FollowContext$Target(
            com.blockout.backend.following.application.FollowContext$TargetType.TEAM, t.teamId))
        FROM TeamFollowEntity t WHERE t.teamId IN :teamIds
        UNION ALL
        SELECT NEW com.blockout.backend.following.application.FollowStore$Relation(
          p.id, p.accountId, NEW com.blockout.backend.following.application.FollowContext$Target(
            com.blockout.backend.following.application.FollowContext$TargetType.POOL, p.poolId))
        FROM PoolFollowEntity p WHERE p.poolId IN :poolIds
        """,
                Relation.class)
            .setParameter("teamIds", teamIds)
            .setParameter("poolIds", poolIds)
            .getResultList());
  }

  /**
   * Detaches the team relation without loading its account or sporting target.
   *
   * @param row persisted association
   * @return immutable original identities
   */
  private Relation toRelation(TeamFollowEntity row) {
    return new Relation(
        row.getId(), row.getAccountId(), new Target(TargetType.TEAM, row.getTeamId()));
  }

  /**
   * Detaches the pool relation without loading its account or sporting target.
   *
   * @param row persisted association
   * @return immutable original identities
   */
  private Relation toRelation(PoolFollowEntity row) {
    return new Relation(
        row.getId(), row.getAccountId(), new Target(TargetType.POOL, row.getPoolId()));
  }
}
