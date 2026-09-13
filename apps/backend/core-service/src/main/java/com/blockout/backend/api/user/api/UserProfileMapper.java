package com.blockout.backend.api.user.api;

import com.blockout.backend.api.user.api.models.UserProfileResponse;
import com.blockout.backend.identity.user.application.UserProfile;
import org.mapstruct.*;

/** Structural transport mapping only; external identity and billing data are not public fields. */
@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    injectionStrategy = InjectionStrategy.CONSTRUCTOR,
    unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface UserProfileMapper {
  /**
   * Projects the owner view into the public profile contract; identity and billing fields stay
   * private.
   *
   * @param profile persisted owner view
   * @return the generated response, or null for a null source as defined by MapStruct
   */
  UserProfileResponse toResponse(UserProfile profile);
}
