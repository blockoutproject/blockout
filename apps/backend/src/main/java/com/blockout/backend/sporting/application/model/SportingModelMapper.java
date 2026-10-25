package com.blockout.backend.sporting.application.model;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.sporting.application.SportingProjectionChanges;
import java.util.UUID;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ValueMapping;

/** Mechanical adaptation between owned sporting values after the use case decides associations. */
@Mapper(config = MappingConfiguration.class)
public interface SportingModelMapper {
  /**
   * Copies official row content with its separately decided participant association.
   *
   * @param source published row without identity-creation authority
   * @param teamId uniquely established participant, or null
   * @return detached row retaining the original statistical values
   */
  StandingsView.Row toRow(StandingsObservation.Row source, UUID teamId);

  /**
   * Retains official row content while replacing only its permitted public association.
   *
   * @param source retained official row
   * @param teamId currently viewable participant, or null
   * @return row with no other content change
   */
  @Mapping(target = "teamId", source = "teamId")
  StandingsView.Row toRow(StandingsView.Row source, UUID teamId);

  /**
   * Maps kinds with a presentation projection without relying on matching enum strings.
   *
   * @param source public sporting kind
   * @return corresponding projection kind
   * @throws IllegalArgumentException when a match has no resource presentation projection
   */
  @ValueMapping(source = "MATCH", target = MappingConstants.THROW_EXCEPTION)
  SportingProjectionChanges.Kind toProjectionKind(SportingVisibility.Kind source);

  /**
   * Maps public resource kinds; division and season activity have separate owner rules.
   *
   * @param source projection scope
   * @return corresponding public visibility kind
   * @throws IllegalArgumentException when the scope has no public visibility contract
   */
  @ValueMapping(source = "DIVISION", target = MappingConstants.THROW_EXCEPTION)
  @ValueMapping(source = "SEASON", target = MappingConstants.THROW_EXCEPTION)
  SportingVisibility.Kind toVisibilityKind(SportingProjectionChanges.Kind source);
}
