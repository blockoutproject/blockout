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
  UserProfileResponse toResponse(UserProfile profile);
}
