package com.blockout.backend.collection.api;

import com.blockout.backend.collection.application.CollectionState;
import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.generated.ingestion.model.CollectionControlInternalResponse;
import com.blockout.backend.generated.ingestion.model.CollectionCycleInternalResponse;
import com.blockout.backend.generated.ingestion.model.CollectionTargetInternalResponse;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetPageInternalResponse;
import com.blockout.backend.generated.ingestion.model.CollectionWorkInternalResponse;
import com.blockout.backend.generated.ingestion.model.CollectorRuntimeInternalResponse;
import com.blockout.backend.generated.ingestion.model.SourceValidationWorkInternalResponse;
import com.blockout.backend.generated.ingestion.model.StartCollectionCycleInternalRequest;
import java.net.URI;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.NullValueCheckStrategy;
import org.openapitools.jackson.nullable.JsonNullable;

/**
 * Maps current application state to generated contracts without loading owners or mutating state.
 */
@Mapper(config = MappingConfiguration.class)
public interface CollectionApiMapper {
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
  @Mapping(target = "municipality", expression = "java(municipality(source))")
  CollectionTargetInternalResponse toDto(CollectionState.ServedTarget source);

  /**
   * Preserves required nullable runtime identity.
   *
   * @param id current startup, or null before registration
   * @return present nullable value; omission is not valid for runtime responses
   */
  default JsonNullable<UUID> nullableId(UUID id) {
    return JsonNullable.of(id);
  }

  /**
   * Separates required geocoding null from non-geocoding omission.
   *
   * @param source selected target
   * @return required current municipal value for geocoding, otherwise an omitted field
   */
  default JsonNullable<String> municipality(CollectionState.ServedTarget source) {
    return source.target().kind() == CollectionTargetKindEnum.GEOCODING
        ? JsonNullable.of(source.municipality())
        : JsonNullable.undefined();
  }

  /**
   * Converts an already qualified source URL.
   *
   * @param value qualified absolute source URL
   * @return native URI for the generated contract
   */
  default URI toUri(String value) {
    return URI.create(value);
  }

  /**
   * Normalizes the representation of a known instant to UTC.
   *
   * @param instant known application timestamp
   * @return the same instant serialized at UTC
   */
  default OffsetDateTime toDate(Instant instant) {
    return instant.atOffset(ZoneOffset.UTC);
  }
}
