package com.blockout.backend.sporting.api;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.generated.mobile.model.AcquisitionClassificationRequest;
import com.blockout.backend.generated.mobile.model.AcquisitionClassificationResponse;
import com.blockout.backend.generated.mobile.model.ClassificationDetailResponse;
import com.blockout.backend.generated.mobile.model.DivisionListResponse;
import com.blockout.backend.generated.mobile.model.DivisionResponse;
import com.blockout.backend.generated.mobile.model.LogoPresentationResponse;
import com.blockout.backend.shared.api.RequiredNullableMapping;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingViews.ClassificationView;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.NullValueCheckStrategy;
import org.openapitools.jackson.nullable.JsonNullable;

/** Mechanical generated-contract mappings, preserving required explicit nulls. */
@Mapper(config = MappingConfiguration.class, uses = RequiredNullableMapping.class)
public interface SportingAdministrationMapper {
  /**
   * Maps the complete classification using the generated contract enums.
   *
   * @param source validated complete request, or null for removal
   * @return immutable complete value, or null
   */
  SportingClassification toCommand(AcquisitionClassificationRequest source);

  /**
   * Maps a present complete acquisition classification.
   *
   * @param source complete application value, or null
   * @return generated response value, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  AcquisitionClassificationResponse toDto(SportingClassification source);

  /**
   * Emits both nullable properties even when acquisition is unavailable.
   *
   * @param source current authorized editor state
   * @return generated response with required null fields present
   */
  @Mapping(
      target = "setting",
      source = "setting",
      nullValueCheckStrategy = NullValueCheckStrategy.ON_IMPLICIT_CONVERSION)
  @Mapping(
      target = "effective",
      source = "effective",
      nullValueCheckStrategy = NullValueCheckStrategy.ON_IMPLICIT_CONVERSION)
  @Mapping(target = "additionalProperties", ignore = true)
  ClassificationDetailResponse toDto(ClassificationView source);

  /**
   * Maps presentation and activity without exposing persisted image bytes.
   *
   * @param source current authorized division
   * @return its generated editor representation
   */
  @Mapping(
      target = "gradient",
      source = "gradient",
      nullValueCheckStrategy = NullValueCheckStrategy.ON_IMPLICIT_CONVERSION)
  @Mapping(target = "logo", source = "source")
  @Mapping(target = "additionalProperties", ignore = true)
  DivisionResponse toDto(DivisionDetail source);

  /**
   * Required nullable response fields are present even when their complete value is null.
   *
   * @param source complete classification, or null
   * @return present nullable generated value
   */
  default JsonNullable<AcquisitionClassificationResponse> nullableClassification(
      SportingClassification source) {
    return JsonNullable.of(toDto(source));
  }

  /**
   * Uses the canonical backend image resource; divisions have no automatic artwork source.
   *
   * @param source current image presence and identity
   * @return manual/effective resource reference, with explicit null for no artwork
   */
  default LogoPresentationResponse logo(DivisionDetail source) {
    String url = com.blockout.backend.sporting.application.ConsultationViewMapper.toLogoUrl(source);
    return new LogoPresentationResponse(url, url, null);
  }

  /**
   * Preserves the owner's selected division order in its collection envelope.
   *
   * @param divisions current authorized divisions
   * @return generated administrative collection
   */
  default DivisionListResponse toDto(List<DivisionDetail> divisions) {
    return new DivisionListResponse(divisions.stream().map(this::toDto).toList());
  }
}
