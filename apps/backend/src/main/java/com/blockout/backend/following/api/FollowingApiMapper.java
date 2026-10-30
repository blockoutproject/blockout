package com.blockout.backend.following.api;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.following.application.ReadFollowLists;
import com.blockout.backend.following.application.ReadFollowOptions.Options;
import com.blockout.backend.following.application.ReadPersonalCalendar;
import com.blockout.backend.generated.mobile.model.FollowOptionsResponse;
import com.blockout.backend.generated.mobile.model.PersonalMatchCalendarResponse;
import com.blockout.backend.generated.mobile.model.PoolFollowsResponse;
import com.blockout.backend.generated.mobile.model.TeamFollowsResponse;
import com.blockout.backend.sporting.api.ConsultationApiMapper;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/** Maps private reads through F03 presentation projections without copying sporting fields. */
@Mapper(config = MappingConfiguration.class, uses = ConsultationApiMapper.class)
public interface FollowingApiMapper {
  /**
   * Maps the current bounded team page with the canonical F03 summary mapper.
   *
   * @param source detached current original-owner page
   * @return generated body with absent continuation only at exhaustion
   */
  @Mapping(target = "additionalProperties", ignore = true)
  TeamFollowsResponse toDto(ReadFollowLists.Teams source);

  /**
   * Maps the current bounded pool page with the canonical F03 summary mapper.
   *
   * @param source detached current original-owner page
   * @return generated body with absent continuation only at exhaustion
   */
  @Mapping(target = "additionalProperties", ignore = true)
  PoolFollowsResponse toDto(ReadFollowLists.Pools source);

  /**
   * Maps current immutable options, omitting an absent default through the generated nullable
   * contract.
   *
   * @param source original-owner current options
   * @return generated non-cacheable response body
   */
  @Mapping(target = "additionalProperties", ignore = true)
  FollowOptionsResponse toDto(Options source);

  /**
   * Wraps the shared F03 calendar with its original-owner follow explanation.
   *
   * @param source detached personal calendar from one consistent read
   * @return generated response reusing the canonical sporting mapper
   */
  @Mapping(target = "additionalProperties", ignore = true)
  PersonalMatchCalendarResponse toDto(ReadPersonalCalendar.Calendar source);
}
