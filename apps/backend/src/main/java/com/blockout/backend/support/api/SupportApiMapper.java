package com.blockout.backend.support.api;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.generated.mobile.model.SupportRequestCreatedResponse;
import java.util.UUID;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * Projects only the accepted opaque request reference; private issue references never enter HTTP.
 */
@Mapper(config = MappingConfiguration.class)
public interface SupportApiMapper {
  /**
   * Maps complete acceptance to the canonical response.
   *
   * @param requestId current send's opaque UUID, only after complete receipt
   * @return generated confirmation without a private repository URL
   */
  @Mapping(target = "requestId", source = "requestId")
  @Mapping(target = "additionalProperties", ignore = true)
  SupportRequestCreatedResponse toDto(UUID requestId);
}
