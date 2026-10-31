package com.blockout.backend.following.infrastructure;

import com.blockout.backend.following.application.FollowContext;
import com.blockout.backend.following.application.FollowContext.Relation;
import com.blockout.backend.following.application.FollowContext.Target;
import com.blockout.backend.following.application.FollowStore;
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
  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public void erase(UUID accountId) {
    teams.erase(accountId);
    pools.erase(accountId);
  }

  private final TeamFollowRepository teams;
  private final PoolFollowRepository pools;
  private final FollowPersistenceMapper mapper;

  /** {@inheritDoc} */
  @Override
  public Optional<Relation> find(FollowContext context) {
    return switch (context.target().type()) {
      case TEAM ->
          teams
              .findByAccountIdAndTeamId(context.accountId(), context.target().id())
              .map(mapper::toView);
      case POOL ->
          pools
              .findByAccountIdAndPoolId(context.accountId(), context.target().id())
              .map(mapper::toView);
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
    return List.copyOf(teams.findRelations(teamIds, poolIds));
  }
}
