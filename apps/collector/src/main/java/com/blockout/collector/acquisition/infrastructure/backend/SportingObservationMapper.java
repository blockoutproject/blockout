package com.blockout.collector.acquisition.infrastructure.backend;

import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.config.MappingConfiguration;
import com.blockout.collector.generated.ingestion.model.AcquisitionFailureInternalRequest;
import com.blockout.collector.generated.ingestion.model.CalendarContextSlotInternalRequest;
import com.blockout.collector.generated.ingestion.model.CalendarMatchInternalRequest;
import com.blockout.collector.generated.ingestion.model.CalendarObservationInternalRequest;
import com.blockout.collector.generated.ingestion.model.CalendarOutcomeInternalResponse;
import com.blockout.collector.generated.ingestion.model.CatalogObservationInternalRequest;
import com.blockout.collector.generated.ingestion.model.CatalogOutcomeInternalResponse;
import com.blockout.collector.generated.ingestion.model.CatalogPoolInternalRequest;
import com.blockout.collector.generated.ingestion.model.ClubDetailsInternalRequest;
import com.blockout.collector.generated.ingestion.model.ClubLocalityObservationInternalRequest;
import com.blockout.collector.generated.ingestion.model.InformationSheetInternalRequest;
import com.blockout.collector.generated.ingestion.model.MatchDetailObservationInternalRequest;
import com.blockout.collector.generated.ingestion.model.MatchFactsInternalRequest;
import com.blockout.collector.generated.ingestion.model.MatchResultInternalRequest;
import com.blockout.collector.generated.ingestion.model.MatchSetScoreInternalRequest;
import com.blockout.collector.generated.ingestion.model.ObservationContextInternalRequest;
import com.blockout.collector.generated.ingestion.model.ObservationOutcomeInternalResponse;
import com.blockout.collector.generated.ingestion.model.StandingRowInternalRequest;
import com.blockout.collector.generated.ingestion.model.StandingsObservationInternalRequest;
import com.blockout.collector.generated.ingestion.model.TeamCandidateInternalRequest;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.openapitools.jackson.nullable.JsonNullable;

/** Mechanical generated-contract mapping; presence decisions remain in provider interpretation. */
@Mapper(config = MappingConfiguration.class)
public interface SportingObservationMapper {
  /**
   * Carries pre-read order and timestamps without inferring publication time.
   *
   * @param context pre-read order and actual timestamps
   * @return unchanged observation context
   */
  ObservationContextInternalRequest toDto(SportingObservation.Context context);

  /**
   * Maps an interpreted calendar to its generated request.
   *
   * @param context attributed read
   * @param source interpreted calendar
   * @return generated request
   */
  CalendarObservationInternalRequest toDto(
      SportingObservation.Context context, SportingObservation.Calendar source);

  /**
   * Maps qualified catalog presence to its generated request.
   *
   * @param context attributed read
   * @param source interpreted catalog
   * @return generated request
   */
  CatalogObservationInternalRequest toDto(
      SportingObservation.Context context, SportingObservation.Catalog source);

  /**
   * Maps official standings publication separately from acquisition failures.
   *
   * @param context attributed read
   * @param source qualified publication state
   * @return generated request
   */
  StandingsObservationInternalRequest toDto(
      SportingObservation.Context context, SportingObservation.Standings source);

  /**
   * Maps attributed detail proposals to their generated request.
   *
   * @param context attributed detail read
   * @param facts interpreted proposals
   * @return generated request
   */
  MatchDetailObservationInternalRequest toDto(
      SportingObservation.Context context, SportingObservation.Facts facts);

  /**
   * Maps geocoding evidence with the current locality revision.
   *
   * @param context attributed lookup
   * @param source current locality evidence
   * @return generated request
   */
  ClubLocalityObservationInternalRequest toDto(
      SportingObservation.Context context, SportingObservation.Locality source);

  /**
   * Preserves original match identity and optional URL provenance.
   *
   * @param source provider match
   * @return native generated match proposal
   */
  CalendarMatchInternalRequest toDto(SportingObservation.Match source);

  /**
   * Preserves textual participant references and provider labels.
   *
   * @param source provider participant
   * @return unchanged native references and labels
   */
  TeamCandidateInternalRequest toDto(SportingObservation.Team source);

  /**
   * Maps recognized non-match context without inventing participants.
   *
   * @param source non-match context
   * @return generated context without invented identity
   */
  CalendarContextSlotInternalRequest toDto(SportingObservation.ContextSlot source);

  /**
   * Maps isolated acquisition failure without copying its original row.
   *
   * @param source safe isolated failure
   * @return attributable failure without its original row
   */
  AcquisitionFailureInternalRequest toDto(SportingObservation.Failure source);

  /**
   * Preserves compound pool identity and optional published URLs.
   *
   * @param source native grouping
   * @return unchanged compound identity and optional URLs
   */
  CatalogPoolInternalRequest toDto(SportingObservation.Pool source);

  /**
   * Preserves official ranking and statistic labels.
   *
   * @param source official row
   * @return published order, position and statistic labels
   */
  StandingRowInternalRequest toDto(SportingObservation.Standing source);

  /**
   * Preserves explicit finality and special result notation.
   *
   * @param source published overall evidence
   * @return its explicit finality and special notation
   */
  MatchResultInternalRequest toDto(SportingObservation.Result source);

  /**
   * Copies actually published set points without recalculation.
   *
   * @param source actually published set
   * @return its unchanged points
   */
  MatchSetScoreInternalRequest toDto(SportingObservation.SetScore source);

  /**
   * Preserves the identifying parts of a qualified document.
   *
   * @param source qualified document context
   * @return its native identifying parts
   */
  InformationSheetInternalRequest toDto(SportingObservation.InformationSheet source);

  /**
   * Uses generated presence accessors to distinguish omission, null and value.
   *
   * @param source interpreted proposals
   * @return omission, explicit null and values preserved
   */
  @Mapping(target = "localDate", ignore = true)
  @Mapping(target = "localTime", ignore = true)
  @Mapping(target = "_localDate", ignore = true)
  @Mapping(target = "_localTime", ignore = true)
  @Mapping(target = "result", ignore = true)
  @Mapping(target = "sets", ignore = true)
  @Mapping(target = "venueName", ignore = true)
  @Mapping(target = "venueAddress", ignore = true)
  @Mapping(target = "referees", ignore = true)
  @Mapping(target = "professionalStreamUrl", ignore = true)
  @Mapping(target = "informationSheet", ignore = true)
  @Mapping(target = "scoresheetUrl", ignore = true)
  @Mapping(target = "statisticsUrl", ignore = true)
  @Mapping(target = "localDate_JsonNullable", source = "localDate")
  @Mapping(target = "localTime_JsonNullable", source = "localTime")
  @Mapping(target = "result_JsonNullable", source = "result")
  @Mapping(target = "sets_JsonNullable", source = "sets")
  @Mapping(target = "venueName_JsonNullable", source = "venueName")
  @Mapping(target = "venueAddress_JsonNullable", source = "venueAddress")
  @Mapping(target = "referees_JsonNullable", source = "referees")
  @Mapping(target = "professionalStreamUrl_JsonNullable", source = "professionalStreamUrl")
  @Mapping(target = "informationSheet_JsonNullable", source = "informationSheet")
  @Mapping(target = "scoresheetUrl_JsonNullable", source = "scoresheetUrl")
  @Mapping(target = "statisticsUrl_JsonNullable", source = "statisticsUrl")
  MatchFactsInternalRequest toDto(SportingObservation.Facts source);

  /**
   * Uses generated presence accessors for source-managed club proposals.
   *
   * @param context attributed read
   * @param source permitted club proposals
   * @return generated request
   */
  @Mapping(target = "address", ignore = true)
  @Mapping(target = "city", ignore = true)
  @Mapping(target = "postalCode", ignore = true)
  @Mapping(target = "email", ignore = true)
  @Mapping(target = "phone", ignore = true)
  @Mapping(target = "website", ignore = true)
  @Mapping(target = "address_JsonNullable", source = "source.address")
  @Mapping(target = "city_JsonNullable", source = "source.city")
  @Mapping(target = "postalCode_JsonNullable", source = "source.postalCode")
  @Mapping(target = "email_JsonNullable", source = "source.email")
  @Mapping(target = "phone_JsonNullable", source = "source.phone")
  @Mapping(target = "website_JsonNullable", source = "source.website")
  ClubDetailsInternalRequest toDto(
      SportingObservation.Context context, SportingObservation.Club source);

  /**
   * Retains sporting acceptance without substituting collector success.
   *
   * @param source validated outcome
   * @return F02-owned acceptance, not inferred success
   */
  SportingObservation.Outcome toView(ObservationOutcomeInternalResponse source);

  /**
   * Retains every independent match outcome and measured count.
   *
   * @param source validated calendar outcome
   * @return all independent acceptance results
   */
  SportingObservation.CalendarOutcome toView(CalendarOutcomeInternalResponse source);

  /**
   * Retains catalog outcome order for compound identity correlation.
   *
   * @param source validated catalog outcome
   * @return positional native-identity outcomes
   */
  SportingObservation.CatalogOutcome toView(CatalogOutcomeInternalResponse source);

  /**
   * Maps an optional result without flattening its presence.
   *
   * @param source optional result proposal
   * @return preserved presence around the mapped object
   */
  default JsonNullable<MatchResultInternalRequest> result(
      JsonNullable<SportingObservation.Result> source) {
    return source.isPresent() ? JsonNullable.of(toDto(source.get())) : JsonNullable.undefined();
  }

  /**
   * Keeps omitted, null and empty set proposals distinct.
   *
   * @param source optional sets proposal
   * @return explicit null, empty and supplied sets remain distinct
   */
  default JsonNullable<List<MatchSetScoreInternalRequest>> sets(
      JsonNullable<List<SportingObservation.SetScore>> source) {
    if (!source.isPresent()) return JsonNullable.undefined();
    return JsonNullable.of(
        source.get() == null ? null : source.get().stream().map(this::toDto).toList());
  }

  /**
   * Maps optional document context without changing its presence.
   *
   * @param source optional document context
   * @return the same presence after mechanical mapping
   */
  default JsonNullable<InformationSheetInternalRequest> sheet(
      JsonNullable<SportingObservation.InformationSheet> source) {
    return source.isPresent() ? JsonNullable.of(toDto(source.get())) : JsonNullable.undefined();
  }

  /**
   * Represents an actual instant in UTC.
   *
   * @param source known instant
   * @return its UTC representation, never an inferred publication time
   */
  default OffsetDateTime toDate(Instant source) {
    return source.atOffset(ZoneOffset.UTC);
  }
}
