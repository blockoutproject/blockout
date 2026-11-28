package com.blockout.backend.sporting.api;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.generated.ingestion.model.CalendarObservationInternalRequest;
import com.blockout.backend.generated.ingestion.model.CalendarOutcomeInternalResponse;
import com.blockout.backend.generated.ingestion.model.CatalogObservationInternalRequest;
import com.blockout.backend.generated.ingestion.model.CatalogOutcomeInternalResponse;
import com.blockout.backend.generated.ingestion.model.InformationSheetInternalRequest;
import com.blockout.backend.generated.ingestion.model.MatchDetailObservationInternalRequest;
import com.blockout.backend.generated.ingestion.model.MatchFactsInternalRequest;
import com.blockout.backend.generated.ingestion.model.MatchResultInternalRequest;
import com.blockout.backend.generated.ingestion.model.MatchSetScoreInternalRequest;
import com.blockout.backend.generated.ingestion.model.ObservationContextInternalRequest;
import com.blockout.backend.generated.ingestion.model.ObservationOutcomeInternalResponse;
import com.blockout.backend.generated.ingestion.model.StandingsObservationInternalRequest;
import com.blockout.backend.generated.ingestion.model.TeamCandidateInternalRequest;
import com.blockout.backend.shared.mapping.TemporalMapping;
import com.blockout.backend.sporting.application.model.CalendarObservation;
import com.blockout.backend.sporting.application.model.CatalogObservation;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.model.StandingsObservation;
import com.blockout.backend.sporting.application.model.TeamCandidate;
import com.blockout.backend.sporting.domain.MatchFacts;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.openapitools.jackson.nullable.JsonNullable;

/** Maps structurally validated generated observations without deciding accepted sporting state. */
@Mapper(config = MappingConfiguration.class, uses = TemporalMapping.class)
public interface SportingObservationMapper {
  /**
   * Maps an existing match's submitted context and independent facts without losing presence.
   *
   * @param matchId match addressed by the HTTP route
   * @param request structurally validated generated request
   * @return immutable application input, still subject to current cycle and sporting checks
   */
  MatchObservation toObservation(UUID matchId, MatchDetailObservationInternalRequest request);

  /**
   * Copies submitted attribution without treating it as authorization.
   *
   * @param source validated collection context
   * @return application attribution, or null for a null source
   */
  MatchObservation.Context toContext(ObservationContextInternalRequest source);

  /**
   * Maps multipart attribution once at the same boundary as JSON observation dates.
   *
   * @param cycleId admitted cycle identity
   * @param readOrdinal logical provider read position
   * @param observedAt actual transport read-completion timestamp
   * @param providerPublishedAt optional provider publication timestamp
   * @return absolute attribution with no inferred publication time
   */
  MatchObservation.Context toContext(
      UUID cycleId,
      long readOrdinal,
      OffsetDateTime observedAt,
      OffsetDateTime providerPublishedAt);

  /**
   * Maps independent facts without unwrapping away their presence.
   *
   * @param source validated fact proposals
   * @return detached application proposals, or null for a null source
   */
  MatchObservation.Facts toFacts(MatchFactsInternalRequest source);

  /**
   * Converts a supplied result while preserving undefined and explicit null through the library.
   *
   * @param source generated presence-bearing result
   * @return the same presence carrying an application result
   */
  default JsonNullable<MatchObservation.Result> toResult(
      JsonNullable<MatchResultInternalRequest> source) {
    return source.map(this::toResult);
  }

  /**
   * Copies the result values without inferring finality or numeric scores.
   *
   * @param source supplied result, possibly null for withdrawal
   * @return application result, or null for withdrawal
   */
  MatchObservation.Result toResult(MatchResultInternalRequest source);

  /**
   * Preserves undefined, explicit null and a supplied list as different set proposals.
   *
   * @param source generated presence-bearing set list
   * @return the same presence with mapped sets
   */
  default JsonNullable<List<MatchFacts.SetScore>> toSets(
      JsonNullable<List<MatchSetScoreInternalRequest>> source) {
    return source.map(this::toSets);
  }

  /**
   * Copies ordered set values, without deriving a match result.
   *
   * @param source supplied sets, possibly null for withdrawal
   * @return mapped sets in source order, or null for withdrawal
   */
  List<MatchFacts.SetScore> toSets(List<MatchSetScoreInternalRequest> source);

  /**
   * Maps a qualified locator while preserving undefined and explicit null.
   *
   * @param source generated presence-bearing locator
   * @return the same presence with an application locator
   */
  default JsonNullable<MatchObservation.InformationSheet> toInformationSheet(
      JsonNullable<InformationSheetInternalRequest> source) {
    return source.map(this::toInformationSheet);
  }

  /**
   * Copies the qualified locator without constructing a provider URL or changing match identity.
   *
   * @param source supplied locator, possibly null for withdrawal
   * @return application locator, or null for withdrawal
   */
  MatchObservation.InformationSheet toInformationSheet(InformationSheetInternalRequest source);

  /**
   * Maps the bounded calendar without interpreting or deduplicating its candidates.
   *
   * @param source validated generated request
   * @return immutable application envelope
   */
  CalendarObservation toObservation(CalendarObservationInternalRequest source);

  /**
   * Maps qualified catalog references in positional order.
   *
   * @param source validated generated request
   * @return immutable application discovery
   */
  CatalogObservation toObservation(CatalogObservationInternalRequest source);

  /**
   * Preserves the provider-native participant reference without inventing a club.
   *
   * @param source submitted participant
   * @return immutable candidate
   */
  @Mapping(target = "nativeReference", source = "nativeTeamReference")
  TeamCandidate toCandidate(TeamCandidateInternalRequest source);

  /**
   * Projects actual per-item calendar outcomes.
   *
   * @param source independently committed result
   * @return canonical generated response
   */
  @Mapping(target = "additionalProperties", ignore = true)
  CalendarOutcomeInternalResponse toDto(ObservationOutcome.Calendar source);

  /**
   * Preserves positional catalog outcomes.
   *
   * @param source atomic catalog result
   * @return canonical generated response
   */
  @Mapping(target = "additionalProperties", ignore = true)
  CatalogOutcomeInternalResponse toDto(ObservationOutcome.Catalog source);

  /**
   * Projects one safe outcome without provider payloads.
   *
   * @param source application result
   * @return canonical generated outcome
   */
  @Mapping(target = "additionalProperties", ignore = true)
  ObservationOutcomeInternalResponse toDto(ObservationOutcome source);

  /**
   * Copies qualified publication evidence and source-ordered rows without creating associations.
   *
   * @param source structurally validated generated request
   * @return immutable table observation
   */
  StandingsObservation toObservation(StandingsObservationInternalRequest source);
}
