package com.blockout.backend.following.infrastructure;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.following.application.FollowContext.Relation;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/** Detaches original follow identities without loading account or sporting entities. */
@Mapper(config = MappingConfiguration.class)
interface FollowPersistenceMapper {
  /**
   * Preserves a team relation's own incarnation and typed sporting target.
   *
   * @param source persisted current association
   * @return immutable original identities
   */
  @Mapping(target = "target.id", source = "teamId")
  @Mapping(target = "target.type", constant = "TEAM")
  Relation toView(TeamFollowEntity source);

  /**
   * Preserves a pool relation's own incarnation and typed sporting target.
   *
   * @param source persisted current association
   * @return immutable original identities
   */
  @Mapping(target = "target.id", source = "poolId")
  @Mapping(target = "target.type", constant = "POOL")
  Relation toView(PoolFollowEntity source);
}
