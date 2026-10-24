package com.blockout.backend.following.api;

import com.blockout.backend.generated.mobile.model.FollowStateResponse;
import org.springframework.stereotype.Component;

/** Builds the required boolean representation; MapStruct does not map primitive sources. */
@Component
public class FollowingApiMapper {
  /**
   * Maps confirmed existence without echoing an unconfirmed request.
   *
   * @param following application-confirmed state
   * @return canonical complete state
   */
  public FollowStateResponse toDto(boolean following) {
    return new FollowStateResponse(following);
  }
}
