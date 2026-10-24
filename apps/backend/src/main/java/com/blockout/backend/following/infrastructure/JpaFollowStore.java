package com.blockout.backend.following.infrastructure;

import com.blockout.backend.following.application.FollowContext;
import com.blockout.backend.following.application.FollowContext.Target;
import com.blockout.backend.following.application.FollowContext.TargetType;
import com.blockout.backend.following.application.FollowStore;
import java.util.ArrayList;
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
    List<Relation> result = new ArrayList<>();
    if (!teamIds.isEmpty())
      teams.findByTeamIdIn(teamIds).forEach(row -> result.add(toRelation(row)));
    if (!poolIds.isEmpty())
      pools.findByPoolIdIn(poolIds).forEach(row -> result.add(toRelation(row)));
    return List.copyOf(result);
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
