package com.blockout.backend.search.api;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.generated.mobile.model.ClubSummaryResponse;
import com.blockout.backend.search.application.SearchPage;
import com.blockout.backend.sporting.api.ConsultationApiMapper;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/** Canonical public club mapping; F03 retains the shared team/pool and identity mapping. */
@Mapper(config = MappingConfiguration.class, uses = ConsultationApiMapper.class)
public interface DiscoveryApiMapper {
  /**
   * Maps only current permitted club values, retaining absent city and logo.
   *
   * @param club detached current summary
   * @return canonical generated club card
   */
  @Mapping(target = "additionalProperties", ignore = true)
  ClubSummaryResponse toResponse(SearchPage.Club club);
}
