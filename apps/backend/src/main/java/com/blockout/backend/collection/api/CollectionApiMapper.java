package com.blockout.backend.collection.api;

import com.blockout.backend.collection.application.model.CollectionResult;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.model.RecordCollectionResult;
import com.blockout.backend.collection.application.service.ObserveCollectionSource;
import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.generated.ingestion.model.CollectionControlInternalResponse;
import com.blockout.backend.generated.ingestion.model.CollectionCycleInternalResponse;
import com.blockout.backend.generated.ingestion.model.CollectionTargetInternalResponse;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetPageInternalResponse;
import com.blockout.backend.generated.ingestion.model.CollectionWorkInternalResponse;
import com.blockout.backend.generated.ingestion.model.CollectorRuntimeInternalResponse;
import com.blockout.backend.generated.ingestion.model.ObserveSeasonSourceInternalRequest;
import com.blockout.backend.generated.ingestion.model.RecordCollectionResultInternalRequest;
import com.blockout.backend.generated.ingestion.model.SeasonSourceInternalResponse;
import com.blockout.backend.generated.ingestion.model.SourceValidationInternalResponse;
import com.blockout.backend.generated.ingestion.model.SourceValidationWorkInternalResponse;
import com.blockout.backend.generated.ingestion.model.StartCollectionCycleInternalRequest;
import com.blockout.backend.generated.ingestion.model.SubmitSourceValidationInternalRequest;
import com.blockout.backend.generated.mobile.model.CollectionResultPageResponse;
import com.blockout.backend.generated.mobile.model.CollectionResultResponse;
import com.blockout.backend.generated.mobile.model.CollectionSeasonResponse;
import com.blockout.backend.generated.mobile.model.DiscoveredCollectionResourcePageResponse;
import com.blockout.backend.generated.mobile.model.DiscoveredCollectionResourceResponse;
import com.blockout.backend.generated.mobile.model.SourceBindingResponse;
import com.blockout.backend.shared.api.RequiredNullableMapping;
import com.blockout.backend.shared.mapping.TemporalMapping;
import com.blockout.backend.shared.mapping.UriMapping;
import com.blockout.backend.sporting.application.model.SportingViews;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.NullValueCheckStrategy;
import org.openapitools.jackson.nullable.JsonNullable;

/**
 * Maps current application state to generated contracts without loading owners or mutating state.
 */
@Mapper(
    config = MappingConfiguration.class,
    uses = {RequiredNullableMapping.class, TemporalMapping.class, UriMapping.class})
public interface CollectionApiMapper {
  /**
   * Wraps selected controls in their existing order.
   *
   * @param source current authorized controls
   * @return the generated collection envelope
   */
  default com.blockout.backend.generated.mobile.model.CollectionControlListResponse toControlsDto(
      java.util.List<CollectionState.ControlView> source) {
    return new com.blockout.backend.generated.mobile.model.CollectionControlListResponse(
        source.stream().map(this::toDto).toList());
  }

  /**
   * Wraps the current preparation seasons in their selected order.
   *
   * @param source authorized season views
   * @return the generated collection envelope
   */
  default com.blockout.backend.generated.mobile.model.CollectionSeasonListResponse toSeasonsDto(
      java.util.List<SportingViews.CollectionSeasonView> source) {
    return new com.blockout.backend.generated.mobile.model.CollectionSeasonListResponse(
        source.stream().map(this::toDto).toList());
  }

  /**
   * Wraps the selected sources without changing their evidence.
   *
   * @param source authorized source views
   * @return the generated collection envelope
   */
  default com.blockout.backend.generated.mobile.model.SourceBindingListResponse toSourcesDto(
      java.util.List<CollectionState.Source> source) {
    return new com.blockout.backend.generated.mobile.model.SourceBindingListResponse(
        source.stream().map(this::toDto).toList());
  }

  /**
   * Projects intent and confirmed execution without inventing freshness.
   *
   * @param source application control projection
   * @return generated operator response with required absent evidence represented by null
   */
  @Mapping(target = ".", source = "control")
  @Mapping(
      target = "pendingRequestId",
      source = "control.requestId",
      nullValueCheckStrategy = NullValueCheckStrategy.ON_IMPLICIT_CONVERSION)
  @Mapping(
      target = "lastAttemptAt",
      source = "control.lastAttemptAt",
      nullValueCheckStrategy = NullValueCheckStrategy.ON_IMPLICIT_CONVERSION)
  @Mapping(
      target = "lastSuccessAt",
      source = "control.lastSuccessAt",
      nullValueCheckStrategy = NullValueCheckStrategy.ON_IMPLICIT_CONVERSION)
  @Mapping(target = "additionalProperties", ignore = true)
  com.blockout.backend.generated.mobile.model.CollectionControlResponse toDto(
      CollectionState.ControlView source);

  /**
   * Projects one retained control cycle, including interrupted work after replacement.
   *
   * @param source retained current cycle
   * @return summary; completion is absent until confirmed
   */
  @Mapping(target = "additionalProperties", ignore = true)
  com.blockout.backend.generated.mobile.model.CollectionCycleSummaryResponse toSummary(
      CollectionState.Cycle source);

  /**
   * Carries qualified source-entry evidence to its application owner.
   *
   * @param source strict generated discovery proposal
   * @return immutable application command
   */
  ObserveCollectionSource.Proposal toCommand(ObserveSeasonSourceInternalRequest source);

  /**
   * Returns existing owner identities without claiming activation.
   *
   * @param source resolved canonical season and binding
   * @return generated discovery acknowledgement
   */
  @Mapping(target = "additionalProperties", ignore = true)
  SeasonSourceInternalResponse toDto(ObserveCollectionSource.Resolved source);

  /**
   * Reuses the shared contract-owned provider enum across generated API namespaces.
   *
   * @param source validated mobile provider
   * @return the identical application provider
   */
  com.blockout.backend.generated.ingestion.model.CollectionProviderEnum toProvider(
      com.blockout.backend.generated.mobile.model.CollectionProviderEnum source);

  /**
   * Projects preparation state from its canonical sporting owner.
   *
   * @param source season preparation view
   * @return wire revision and lifecycle
   */
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(target = "revision", source = "collectionRevision")
  @Mapping(target = "state", source = "collectionState")
  CollectionSeasonResponse toDto(SportingViews.CollectionSeasonView source);

  /**
   * Projects source evidence, preserving every required nullable property.
   *
   * @param source current source or honest interrupted-validation projection
   * @return source preparation response, without mapping metadata
   */
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(
      target = "label",
      expression = "java(source.provider().name() + \" / \" + source.organizerReference())")
  @Mapping(target = "validation", source = "validationState")
  @Mapping(
      target = "candidateUrl",
      source = "candidateUrl",
      nullValueCheckStrategy = NullValueCheckStrategy.ON_IMPLICIT_CONVERSION)
  @Mapping(
      target = "acceptedUrl",
      source = "acceptedUrl",
      nullValueCheckStrategy = NullValueCheckStrategy.ON_IMPLICIT_CONVERSION)
  @Mapping(
      target = "validatedAt",
      source = "validatedAt",
      nullValueCheckStrategy = NullValueCheckStrategy.ON_IMPLICIT_CONVERSION)
  @Mapping(
      target = "seasonEvidence",
      source = "seasonEvidence",
      nullValueCheckStrategy = NullValueCheckStrategy.ON_IMPLICIT_CONVERSION)
  @Mapping(
      target = "reason",
      source = "reason",
      nullValueCheckStrategy = NullValueCheckStrategy.ON_IMPLICIT_CONVERSION)
  SourceBindingResponse toDto(CollectionState.Source source);

  /**
   * Converts terminal evidence at the generated ingestion boundary.
   *
   * @param source validated transport input
   * @return application evidence without transport DTO ownership
   */
  CollectionState.SourceValidation toCommand(SubmitSourceValidationInternalRequest source);

  /**
   * Acknowledges the current accepted qualification with its resulting editing revision.
   *
   * @param source accepted source
   * @return minimal ingestion acknowledgement
   */
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(target = "sourceBindingId", source = "id")
  @Mapping(target = "state", source = "validationState")
  SourceValidationInternalResponse toValidationDto(CollectionState.Source source);

  /**
   * Maps bounded direct children without classification readiness.
   *
   * @param source owning sporting page
   * @return generated page preserving order and hasNext
   */
  @Mapping(target = "additionalProperties", ignore = true)
  DiscoveredCollectionResourcePageResponse toDto(SportingViews.CollectionResourcePage source);

  /**
   * Maps one discovered native identity.
   *
   * @param source pack or pool with optional native parent
   * @return preparation navigation entry
   */
  @Mapping(target = "additionalProperties", ignore = true)
  DiscoveredCollectionResourceResponse toDto(SportingViews.CollectionResource source);

  /**
   * Converts independently reported phase evidence to the application command.
   *
   * @param source validated result submission
   * @return independent application evidence
   */
  RecordCollectionResult toCommand(RecordCollectionResultInternalRequest source);

  /**
   * Projects bounded current results in their existing canonical order.
   *
   * @param source current bounded evidence
   * @return generated page in canonical order
   */
  @Mapping(target = "additionalProperties", ignore = true)
  CollectionResultPageResponse toDto(CollectionState.ResultPage source);

  /**
   * Keeps required nullable timestamps present in the operational response.
   *
   * @param source stable scope evidence
   * @return safe operational view without raw provider data
   */
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(target = "scopeLabel", source = "scopeId")
  @Mapping(
      target = "lastSuccessAt",
      source = "lastSuccessAt",
      nullValueCheckStrategy = NullValueCheckStrategy.ON_IMPLICIT_CONVERSION)
  CollectionResultResponse toDto(CollectionResult source);

  /**
   * Retains the conditional admission purpose.
   *
   * @param source validated wire admission
   * @return application command retaining its conditional purpose
   */
  CollectionState.StartCycle toCommand(StartCollectionCycleInternalRequest source);

  /**
   * Preserves explicit absence before registration.
   *
   * @param source current environment registration
   * @return required explicit null before first registration
   */
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(
      target = "incarnationId",
      source = "incarnationId",
      nullValueCheckStrategy = NullValueCheckStrategy.ON_IMPLICIT_CONVERSION)
  CollectorRuntimeInternalResponse toDto(CollectionState.Runtime source);

  /**
   * Exposes only the admitted purpose.
   *
   * @param source current retained cycle
   * @return generated admitted context with purpose-specific omissions
   */
  @Mapping(target = "additionalProperties", ignore = true)
  CollectionCycleInternalResponse toDto(CollectionState.Cycle source);

  /**
   * Projects the exact validation expectation.
   *
   * @param source exact candidate snapshot
   * @return source expectation without a collection mode
   */
  @Mapping(target = "additionalProperties", ignore = true)
  SourceValidationWorkInternalResponse toDto(CollectionState.Candidate source);

  /**
   * Projects current work without claiming it.
   *
   * @param source current scheduling context
   * @return generated current controls and validation requests
   */
  @Mapping(target = "additionalProperties", ignore = true)
  CollectionWorkInternalResponse toDto(CollectionState.Work source);

  /**
   * Projects one independent scheduling control.
   *
   * @param source current independent family
   * @return generated scheduling projection
   */
  @Mapping(target = "additionalProperties", ignore = true)
  CollectionControlInternalResponse toDto(CollectionState.ControlWork source);

  /**
   * Preserves bounded page order and current locality.
   *
   * @param source bounded snapshot page
   * @return generated page retaining current locality enrichment
   */
  @Mapping(target = "additionalProperties", ignore = true)
  CollectionTargetPageInternalResponse toDto(CollectionState.TargetPage source);

  /**
   * Adds permitted locality only to a geocoding target.
   *
   * @param source frozen context and current permitted locality
   * @return generated target with an explicit nullable municipality only for geocoding
   */
  @Mapping(target = ".", source = "target")
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(target = "municipality", source = "source", qualifiedByName = "municipality")
  CollectionTargetInternalResponse toDto(CollectionState.ServedTarget source);

  /**
   * Separates required geocoding null from non-geocoding omission.
   *
   * @param source selected target
   * @return required current municipal value for geocoding, otherwise an omitted field
   */
  @Named("municipality")
  default JsonNullable<String> municipality(CollectionState.ServedTarget source) {
    return source.target().kind() == CollectionTargetKindEnum.GEOCODING
        ? JsonNullable.of(source.municipality())
        : JsonNullable.undefined();
  }
}
