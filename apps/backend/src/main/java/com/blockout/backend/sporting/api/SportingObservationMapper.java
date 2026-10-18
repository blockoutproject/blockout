package com.blockout.backend.sporting.api;

import com.blockout.backend.generated.ingestion.model.ObserveMatchDetailRequest;
import com.blockout.backend.generated.ingestion.model.ObservePoolCalendarRequestMatchesInnerFacts;
import com.blockout.backend.generated.ingestion.model.ObservePoolCalendarRequestMatchesInnerFactsInformationSheet;
import com.blockout.backend.generated.ingestion.model.ObservePoolCalendarRequestMatchesInnerFactsResult;
import com.blockout.backend.generated.ingestion.model.ObservePoolCalendarRequestMatchesInnerFactsSetsInner;
import com.blockout.backend.generated.ingestion.model.ObserveSportingCatalogRequestContext;
import com.blockout.backend.sporting.application.MatchObservation;
import java.util.List;
import java.util.UUID;
import org.mapstruct.InjectionStrategy;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.NullValueCheckStrategy;
import org.mapstruct.ReportingPolicy;
import org.openapitools.jackson.nullable.JsonNullable;

/** Maps structurally validated generated observations without deciding accepted sporting state. */
@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    injectionStrategy = InjectionStrategy.CONSTRUCTOR,
    nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS,
    unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface SportingObservationMapper {
  /**
   * Maps an existing match's submitted context and independent facts without losing presence.
   *
   * @param matchId match addressed by the HTTP route
   * @param request structurally validated generated request
   * @return immutable application input, still subject to current cycle and sporting checks
   */
  MatchObservation toObservation(UUID matchId, ObserveMatchDetailRequest request);

  /**
   * Copies submitted attribution without treating it as authorization.
   *
   * @param source validated collection context
   * @return application attribution, or null for a null source
   */
  MatchObservation.Context toContext(ObserveSportingCatalogRequestContext source);

  /**
   * Maps independent facts without unwrapping away their presence.
   *
   * @param source validated fact proposals
   * @return detached application proposals, or null for a null source
   */
  MatchObservation.Facts toFacts(ObservePoolCalendarRequestMatchesInnerFacts source);

  /**
   * Converts a supplied result while preserving undefined and explicit null through the library.
   *
   * @param source generated presence-bearing result
   * @return the same presence carrying an application result
   */
  default JsonNullable<MatchObservation.Result> toResult(
      JsonNullable<ObservePoolCalendarRequestMatchesInnerFactsResult> source) {
    return source.map(this::toResult);
  }

  /**
   * Copies the result values without inferring finality or numeric scores.
   *
   * @param source supplied result, possibly null for withdrawal
   * @return application result, or null for withdrawal
   */
  MatchObservation.Result toResult(ObservePoolCalendarRequestMatchesInnerFactsResult source);

  /**
   * Preserves undefined, explicit null and a supplied list as different set proposals.
   *
   * @param source generated presence-bearing set list
   * @return the same presence with mapped sets
   */
  default JsonNullable<List<MatchObservation.SetScore>> toSets(
      JsonNullable<List<ObservePoolCalendarRequestMatchesInnerFactsSetsInner>> source) {
    return source.map(this::toSets);
  }

  /**
   * Copies ordered set values, without deriving a match result.
   *
   * @param source supplied sets, possibly null for withdrawal
   * @return mapped sets in source order, or null for withdrawal
   */
  List<MatchObservation.SetScore> toSets(
      List<ObservePoolCalendarRequestMatchesInnerFactsSetsInner> source);

  /**
   * Maps a qualified locator while preserving undefined and explicit null.
   *
   * @param source generated presence-bearing locator
   * @return the same presence with an application locator
   */
  default JsonNullable<MatchObservation.InformationSheet> toInformationSheet(
      JsonNullable<ObservePoolCalendarRequestMatchesInnerFactsInformationSheet> source) {
    return source.map(this::toInformationSheet);
  }

  /**
   * Copies the qualified locator without constructing a provider URL or changing match identity.
   *
   * @param source supplied locator, possibly null for withdrawal
   * @return application locator, or null for withdrawal
   */
  MatchObservation.InformationSheet toInformationSheet(
      ObservePoolCalendarRequestMatchesInnerFactsInformationSheet source);
}
