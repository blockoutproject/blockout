package com.blockout.backend.api.sports.api;

import com.blockout.backend.api.config.ApiMappingConfiguration;
import com.blockout.backend.api.user.api.models.*;
import com.blockout.backend.sports.administration.application.*;
import org.mapstruct.*;

/** Mechanical generated-transport mapping; authorization and reference rules stay with owners. */
@Mapper(config = ApiMappingConfiguration.class)
public interface FfvbMapper {
  /**
   * Maps validated configuration fields into the owner command.
   *
   * @param request validated HTTP replacement
   * @return owner configuration command
   */
  FfvbConfigurationCommand toCommand(FfvbConfigurationRequest request);

  /**
   * Maps division fields without choosing an identity.
   *
   * @param request validated division fields
   * @return owner division command
   */
  DivisionCommand toCommand(DivisionRequest request);

  /**
   * Maps explicit provider classifications to the domain enums.
   *
   * @param request validated mapping fields
   * @return owner mapping command
   */
  FfvbMappingCommand toCommand(FfvbMappingRequest request);

  /**
   * Projects configuration while omitting its administrator identity.
   *
   * @param view local configuration
   * @return generated response without actor identifiers
   */
  FfvbConfigurationResponse toResponse(FfvbConfigurationView view);

  /**
   * Projects a stable public division.
   *
   * @param view local division
   * @return generated division
   */
  DivisionResponse toResponse(DivisionView view);

  /**
   * Projects an observed label with nullable association fields.
   *
   * @param view observed label association
   * @return generated mapping retaining absent classifications
   */
  FfvbMappingResponse toResponse(FfvbMappingView view);

  /**
   * Projects a bounded owner slice into generated page structure.
   *
   * @param slice owner page
   * @return generated division page
   */
  @Mapping(target = "pageInfo", source = "slice")
  DivisionPage toDivisionPage(SportsSlice<DivisionView> slice);

  /**
   * Projects a bounded owner slice into generated page structure.
   *
   * @param slice owner page
   * @return generated mapping page
   */
  @Mapping(target = "pageInfo", source = "slice")
  FfvbMappingPage toMappingPage(SportsSlice<FfvbMappingView> slice);

  /**
   * Maps the owner continuation metadata without calculating totals.
   *
   * @param slice owner continuation metadata
   * @return public pagination information
   */
  SportsPageInfo toPageInfo(SportsSlice<?> slice);
}
