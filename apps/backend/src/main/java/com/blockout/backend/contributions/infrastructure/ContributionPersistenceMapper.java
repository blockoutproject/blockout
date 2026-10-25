package com.blockout.backend.contributions.infrastructure;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.contributions.domain.ContributionState;
import com.blockout.backend.contributions.domain.ContributionVersion;
import com.blockout.backend.contributions.domain.ContributionVersion.Decision;
import com.blockout.backend.contributions.domain.StreamAddress;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

/** Detaches persistent facts without exposing entities through the application port. */
@Mapper(config = MappingConfiguration.class)
public interface ContributionPersistenceMapper {
  /**
   * Maps an existing state; the store supplies the initial value for an absent row.
   *
   * @param entity existing match-local state
   * @return detached revision and hold
   */
  ContributionState toDomain(MatchContributionStateEntity entity);

  /**
   * Maps immutable facts, nullable ownership and distinct publication/lifecycle decisions.
   *
   * @param entity loaded version
   * @return detached literal version with no invented attribution or decision
   */
  @Mapping(target = "publication", source = "entity", qualifiedByName = "publication")
  @Mapping(target = "decision", source = "entity", qualifiedByName = "decision")
  ContributionVersion toDomain(ContributionVersionEntity entity);

  /**
   * Restores the locally validated literal rather than URI's component equality.
   *
   * @param address persistent literal
   * @return recognized address without normalization
   */
  default StreamAddress toAddress(String address) {
    return new StreamAddress(address);
  }

  /**
   * Preserves the distinction between never published and published by an erased actor.
   *
   * @param entity persistent version
   * @return initial publication decision or null
   */
  @Named("publication")
  default Decision publication(ContributionVersionEntity entity) {
    return entity.getPublicationKind() == null
        ? null
        : new Decision(
            entity.getPublicationKind(), entity.getPublicationAt(), entity.getPublicationActorId());
  }

  /**
   * Preserves a later lifecycle decision independently of initial publication.
   *
   * @param entity persistent version
   * @return later decision or null
   */
  @Named("decision")
  default Decision decision(ContributionVersionEntity entity) {
    return entity.getDecisionKind() == null
        ? null
        : new Decision(
            entity.getDecisionKind(), entity.getDecisionAt(), entity.getDecisionActorId());
  }
}
