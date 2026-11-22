package com.blockout.backend.sporting.api;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.generated.mobile.model.AcquisitionClassificationRequest;
import com.blockout.backend.generated.mobile.model.AcquisitionClassificationResponse;
import com.blockout.backend.generated.mobile.model.ClassificationDetailResponse;
import com.blockout.backend.generated.mobile.model.CreateDivisionRequest;
import com.blockout.backend.generated.mobile.model.DivisionListResponse;
import com.blockout.backend.generated.mobile.model.DivisionResponse;
import com.blockout.backend.generated.mobile.model.LogoPresentationResponse;
import com.blockout.backend.generated.mobile.model.MappingClassificationResponse;
import com.blockout.backend.generated.mobile.model.MappingFilterOptionPageResponse;
import com.blockout.backend.generated.mobile.model.MappingFilterOptionResponse;
import com.blockout.backend.generated.mobile.model.MappingPackDetailResponse;
import com.blockout.backend.generated.mobile.model.MappingPackPageResponse;
import com.blockout.backend.generated.mobile.model.MappingPackResponse;
import com.blockout.backend.generated.mobile.model.MappingPoolModeEnum;
import com.blockout.backend.generated.mobile.model.MappingPoolResponse;
import com.blockout.backend.shared.api.RequiredNullableMapping;
import com.blockout.backend.shared.pagination.OffsetPage;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingMapping.MappingFilterOption;
import com.blockout.backend.sporting.application.model.SportingMapping.MappingPack;
import com.blockout.backend.sporting.application.model.SportingMapping.MappingPool;
import com.blockout.backend.sporting.application.model.SportingMapping.PackMappingDetail;
import com.blockout.backend.sporting.application.model.SportingPresentation.DivisionDefinition;
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
  @Mapping(target = "additionalProperties", ignore = true)
  MappingPackPageResponse toPackPage(OffsetPage<MappingPack> source);

  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(target = ".", source = "pools")
  MappingPackDetailResponse toDto(PackMappingDetail source);

  @Mapping(target = "additionalProperties", ignore = true)
  MappingFilterOptionPageResponse toFilterOptions(OffsetPage<MappingFilterOption> source);

  @Mapping(target = "additionalProperties", ignore = true)
  MappingFilterOptionResponse toDto(MappingFilterOption source);

  /** Uses the generated constructor to emit the required null for an unset pack default. */
  default MappingPackResponse toDto(MappingPack source) {
    return new MappingPackResponse(
        source.id(),
        source.label(),
        source.sourceId(),
        source.sourceLabel(),
        source.seasonId(),
        source.seasonLabel(),
        toDto(source.defaultClassification(), source.defaultDivisionName()),
        source.status(),
        source.poolCount(),
        source.classifiedPoolCount());
  }

  /** Uses the generated constructor to emit the required null for an unclassified pool. */
  default MappingPoolResponse toDto(MappingPool source) {
    return new MappingPoolResponse(
        source.id(),
        source.label(),
        source.inherited() ? MappingPoolModeEnum.INHERITED : MappingPoolModeEnum.CUSTOM,
        toDto(source.effectiveClassification(), source.effectiveDivisionName()));
  }

  @Mapping(target = "additionalProperties", ignore = true)
  MappingClassificationResponse toDto(SportingClassification classification, String divisionName);

  /**
   * Captures valid division metadata before decoding optional image content.
   *
   * @param source complete generated multipart metadata
   * @return immutable application metadata with the division name invariant
   */
  DivisionDefinition toCommand(CreateDivisionRequest source);

  /**
   * Retains explicit null for the required nullable gradient.
   *
   * @param value present nullable generated gradient
   * @return the supplied colors, or null for derived treatment
   */
  default List<String> unwrapGradient(JsonNullable<List<String>> value) {
    return value.get();
  }

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
