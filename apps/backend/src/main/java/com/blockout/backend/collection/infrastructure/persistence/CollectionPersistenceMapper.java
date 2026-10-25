package com.blockout.backend.collection.infrastructure.persistence;

import com.blockout.backend.collection.application.model.CollectionResult;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.generated.ingestion.model.CollectionCycleStateEnum;
import java.net.URI;
import java.util.Objects;
import java.util.UUID;
import org.mapstruct.Context;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

/** Mechanical persistence projections; interrupted state derives from the current runtime only. */
@Mapper(config = MappingConfiguration.class)
interface CollectionPersistenceMapper {
  /**
   * Detaches one current result.
   *
   * @param source persisted independent evidence
   * @return immutable current evidence with its logical order
   */
  @Mapping(target = "observedAt", source = "lastAttemptAt")
  CollectionResult toView(CollectionResultEntity source);

  /**
   * Stores newer evidence while retaining its stable key.
   *
   * @param controlId admitted owner
   * @param source current evidence computed by the application
   * @return complete current-state row
   */
  @Mapping(target = "lastAttemptAt", source = "source.observedAt")
  CollectionResultEntity toEntity(UUID controlId, CollectionResult source);

  /**
   * Replaces current evidence under the control lock without merging a detached copy.
   *
   * @param source newer application-approved evidence, including explicit cleared failure fields
   * @param target managed row with the same immutable evidence key
   */
  @Mapping(target = "controlId", ignore = true)
  @Mapping(target = "scopeId", ignore = true)
  @Mapping(target = "stage", ignore = true)
  @Mapping(target = "phase", ignore = true)
  @Mapping(target = "lastAttemptAt", source = "observedAt")
  void update(CollectionResult source, @MappingTarget CollectionResultEntity target);

  /**
   * Restores the persisted machine-readable reason type.
   *
   * @param value persisted safe type
   * @return native URI for the contract
   */
  default URI toUri(String value) {
    return URI.create(value);
  }

  /**
   * Persists the machine-readable reason without a provider payload.
   *
   * @param value safe machine type
   * @return its persisted URI representation
   */
  default String toText(URI value) {
    return value.toString();
  }

  /**
   * Detaches current registration.
   *
   * @param source current registration
   * @return detached runtime state
   */
  CollectionState.Runtime toView(CollectorRuntimeEntity source);

  /**
   * Detaches current control configuration.
   *
   * @param source current control with loaded pending selections
   * @return detached operational state
   */
  CollectionState.Control toView(CollectionControlEntity source);

  /**
   * Detaches the proposed and accepted source state.
   *
   * @param source current supported binding
   * @return detached candidate/accepted context
   */
  CollectionState.Source toView(SourceBindingEntity source);

  /**
   * Replaces mutable source state, including explicit evidence clearing.
   *
   * @param source application-approved state; identity and revision remain persistence-owned
   * @param target managed binding held by the transaction
   */
  void update(CollectionState.Source source, @MappingTarget SourceBindingEntity target);

  /**
   * Projects current completion without updating obsolete rows.
   *
   * @param source current cycle
   * @param current current incarnation, read under the runtime fence for writes
   * @return detached context with honest interrupted/completed state
   */
  @Mapping(target = "state", expression = "java(state(source, current))")
  @Mapping(target = "candidate", expression = "java(candidate(source))")
  CollectionState.Cycle toView(CollectionCycleEntity source, @Context UUID current);

  /**
   * Detaches a frozen nonpersonal reference.
   *
   * @param source snapshot row without personal locality
   * @return frozen identity/configuration
   */
  CollectionState.Target toView(CollectionTargetEntity source);

  /**
   * Creates a snapshot row owned by the admission adapter.
   *
   * @param source authorized immutable reference
   * @return unpersisted snapshot row; adapter assigns its cycle
   */
  @Mapping(target = "cycleId", ignore = true)
  CollectionTargetEntity toEntity(CollectionState.Target source);

  /**
   * Derives interruption while preserving accepted completion.
   *
   * @param source retained context
   * @param current current startup
   * @return accepted completion survives replacement; unfinished old work is interrupted
   */
  default CollectionCycleStateEnum state(CollectionCycleEntity source, UUID current) {
    if (source.getCompletedAt() != null) return CollectionCycleStateEnum.COMPLETED;
    return Objects.equals(source.getIncarnationId(), current)
        ? CollectionCycleStateEnum.RUNNING
        : CollectionCycleStateEnum.INTERRUPTED;
  }

  /**
   * Exposes candidate data only for validation contexts.
   *
   * @param source admitted context
   * @return validation-only candidate; control passages have none
   */
  default CollectionState.Candidate candidate(CollectionCycleEntity source) {
    return source.getSourceBindingId() == null
        ? null
        : new CollectionState.Candidate(
            source.getSourceBindingId(),
            source.getRevision(),
            source.getCandidateUrl(),
            source.getSeasonLabel(),
            source.getProvider(),
            source.getOrganizerReference());
  }
}
