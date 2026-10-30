package com.blockout.backend.following.api;

import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.following.application.FollowContext;
import java.time.ZoneId;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Following-specific binding used after the existing mobile security and F12 admission filter. */
@Component
@RequiredArgsConstructor
public class FollowingRequest {
  private final CurrentAccount current;

  /**
   * Keeps the requested original UUID rather than redirecting to a newly established account. No
   * administrator, collector or Pro claim grants another account's follows.
   *
   * @param original account UUID from the generated path binding
   * @return that same UUID after the current F05 mapping matches
   * @throws ResponseStatusException with safe 404 for an absent/different account; storage outages
   *     retain their shared HTTP owner
   */
  public UUID requireOwner(UUID original) {
    return current
        .findId()
        .filter(original::equals)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
  }

  /**
   * Captures owner and target together without claiming a lock or a sporting eligibility check.
   *
   * @param original original account from the request
   * @param type team or pool association
   * @param target sporting UUID from the request
   * @return detached values for the application boundary
   */
  public FollowContext member(UUID original, FollowContext.TargetType type, UUID target) {
    return new FollowContext(requireOwner(original), new FollowContext.Target(type, target));
  }

  /**
   * Keeps calendar grouping limited to an actual IANA zone; ordinary MVC owns wire conversion.
   *
   * @param value requested calendar grouping zone
   * @return the selected IANA zone
   * @throws ResponseStatusException when the name is not an available IANA zone
   */
  public ZoneId calendarZone(String value) {
    if (!ZoneId.getAvailableZoneIds().contains(value)) throw invalid();
    return ZoneId.of(value);
  }

  /** Creates an opaque canonical validation refusal without retaining rejected query data. */
  private static ResponseStatusException invalid() {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST);
  }
}
