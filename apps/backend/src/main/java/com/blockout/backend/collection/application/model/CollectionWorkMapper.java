package com.blockout.backend.collection.application.model;

import com.blockout.backend.collection.application.model.CollectionState.Candidate;
import com.blockout.backend.collection.application.model.CollectionState.Control;
import com.blockout.backend.collection.application.model.CollectionState.ControlWork;
import com.blockout.backend.collection.application.model.CollectionState.ServedTarget;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.model.CollectionState.Target;
import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.sporting.application.model.AcquisitionReference;
import com.blockout.backend.sporting.application.model.ClubAcquisitionReference;
import com.blockout.backend.sporting.application.model.ClubLocalityView;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import java.util.UUID;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/** Mechanical work projections after services decide admission, cadence and current eligibility. */
@Mapper(config = MappingConfiguration.class)
public interface CollectionWorkMapper {
  /**
   * Combines retained control intent with the service's current lifecycle and running selection.
   *
   * @param source current non-null control
   * @param seasonState current season state, null for seasonless families
   * @param runningCycleId confirmed current cycle, null when none is running
   * @return current scheduling projection without admitting work
   */
  ControlWork toView(Control source, CollectionSeasonStateEnum seasonState, UUID runningCycleId);

  /**
   * Freezes the exact candidate and already selected canonical season.
   *
   * @param source current non-null source
   * @param season non-null expected season
   * @return unchanged source evidence with its expected season label
   */
  @Mapping(target = "sourceBindingId", source = "source.id")
  @Mapping(target = "seasonLabel", source = "season.label")
  Candidate toCandidate(Source source, CollectionSeasonView season);

  /**
   * Projects a qualified sporting reference without inventing absent nested keys or classification.
   *
   * @param reference non-null F02 acquisition input
   * @param source non-null admitted source binding
   * @param season non-null admitted season
   * @return frozen nonpersonal target before attempt evidence is attached
   */
  @Mapping(target = "sourceBindingId", source = "source.id")
  @Mapping(target = "seasonLabel", source = "season.label")
  @Mapping(target = "provider", source = "reference.provider")
  @Mapping(target = "organizerReference", source = "source.organizerReference")
  @Mapping(target = "competitionReference", source = "reference.poolKey.competitionReference")
  @Mapping(target = "poolReference", source = "reference.poolKey.reference")
  @Mapping(target = "tourReference", source = "reference.poolKey.tourReference")
  @Mapping(target = "groupReference", source = "reference.poolKey.groupReference")
  @Mapping(target = "divisionId", source = "reference.classification.divisionId")
  @Mapping(target = "format", source = "reference.classification.format")
  @Mapping(target = "gender", source = "reference.classification.gender")
  @Mapping(target = "clubId", ignore = true)
  @Mapping(target = "clubReference", ignore = true)
  @Mapping(target = "lastAttemptAt", ignore = true)
  @Mapping(target = "lastSuccessAt", ignore = true)
  @Mapping(target = "nativeTeamReference", ignore = true)
  Target toTarget(AcquisitionReference reference, Source source, CollectionSeasonView season);

  /**
   * Projects one seasonless club reference using the service's selected read purpose.
   *
   * @param source non-null current club reference
   * @param kind already selected club-sheet or geocoding purpose
   * @return nonpersonal club target without seasonal fields or copied locality
   */
  @Mapping(target = "scopeId", source = "source.clubId")
  @Mapping(target = "sourceBindingId", ignore = true)
  @Mapping(target = "url", ignore = true)
  @Mapping(target = "seasonLabel", ignore = true)
  @Mapping(target = "competitionReference", ignore = true)
  @Mapping(target = "packReference", ignore = true)
  @Mapping(target = "poolReference", ignore = true)
  @Mapping(target = "tourReference", ignore = true)
  @Mapping(target = "groupReference", ignore = true)
  @Mapping(target = "poolId", ignore = true)
  @Mapping(target = "matchId", ignore = true)
  @Mapping(target = "divisionId", ignore = true)
  @Mapping(target = "format", ignore = true)
  @Mapping(target = "gender", ignore = true)
  @Mapping(target = "lastAttemptAt", ignore = true)
  @Mapping(target = "lastSuccessAt", ignore = true)
  @Mapping(target = "fastWindowEndsAt", ignore = true)
  @Mapping(target = "organizerReference", ignore = true)
  @Mapping(target = "nativeMatchReference", ignore = true)
  @Mapping(target = "nativeTeamReference", ignore = true)
  Target toTarget(ClubAcquisitionReference source, CollectionTargetKindEnum kind);

  /**
   * Projects an already qualified discovery root before child selection.
   *
   * @param source non-null locked source with its accepted URL
   * @param season non-null admitted season
   * @return source-scoped discovery target without child or personal values
   */
  @Mapping(target = "scopeId", source = "source.id")
  @Mapping(target = "kind", constant = "DISCOVERY")
  @Mapping(target = "sourceBindingId", source = "source.id")
  @Mapping(target = "url", source = "source.acceptedUrl")
  @Mapping(target = "seasonLabel", source = "season.label")
  @Mapping(target = "competitionReference", ignore = true)
  @Mapping(target = "packReference", ignore = true)
  @Mapping(target = "poolReference", ignore = true)
  @Mapping(target = "tourReference", ignore = true)
  @Mapping(target = "groupReference", ignore = true)
  @Mapping(target = "poolId", ignore = true)
  @Mapping(target = "matchId", ignore = true)
  @Mapping(target = "clubId", ignore = true)
  @Mapping(target = "clubReference", ignore = true)
  @Mapping(target = "divisionId", ignore = true)
  @Mapping(target = "format", ignore = true)
  @Mapping(target = "gender", ignore = true)
  @Mapping(target = "lastAttemptAt", ignore = true)
  @Mapping(target = "lastSuccessAt", ignore = true)
  @Mapping(target = "fastWindowEndsAt", ignore = true)
  @Mapping(target = "nativeMatchReference", ignore = true)
  @Mapping(target = "nativeTeamReference", ignore = true)
  Target toDiscoveryTarget(Source source, CollectionSeasonView season);

  /**
   * Adds only the current locality selected by the service for a geocoding target.
   *
   * @param target non-null frozen target
   * @param locality current permitted locality, null for other target purposes
   * @return target with current nullable locality values, preserving absence
   */
  ServedTarget toServedTarget(Target target, ClubLocalityView locality);
}
