package com.blockout.backend.following.api;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.following.application.ReadFollowOptions.Options;
import com.blockout.backend.generated.mobile.model.FollowOptionsResponse;
import com.blockout.backend.sporting.api.ConsultationApiMapper;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * Maps private options using the existing F03 season projection without copying sporting fields.
 */
@Mapper(config = MappingConfiguration.class, uses = ConsultationApiMapper.class)
public interface FollowingApiMapper {
  /**
   * Maps current immutable options, omitting an absent default through the generated nullable
   * contract.
   *
   * @param source original-owner current options
   * @return generated non-cacheable response body
   */
  @Mapping(target = "additionalProperties", ignore = true)
  FollowOptionsResponse toDto(Options source);
}
