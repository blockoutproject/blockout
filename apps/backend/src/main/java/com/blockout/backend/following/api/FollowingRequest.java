package com.blockout.backend.following.api;

import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.following.application.FollowContext;
import jakarta.servlet.http.HttpServletRequest;
import java.time.ZoneId;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
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
   * @throws ResponseStatusException with safe 404 for an absent/different account ; storage outages
   *     retain their shared HTTP owner
   */
  public UUID requireOwner(UUID original) {
    try {
      if (!original.equals(current.id())) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
      return original;
    } catch (AccessDeniedException absent) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
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
   * Rejects undeclared/repeated scalars and wire values that native MVC would coerce to absence.
   * Generated Bean Validation owns the individual page bounds, enum and body constraints.
   *
   * @param request native request retaining repeated query parameters
   * @param shape the operation's declared following query shape
   * @throws ResponseStatusException with safe 400 for malformed or undeclared input
   */
  public void validateQuery(HttpServletRequest request, QueryShape shape) {
    Set<String> allowed =
        switch (shape) {
          case MEMBER -> Set.of();
          case LIST -> Set.of("seasonId", "page");
          case CALENDAR -> Set.of("seasonId", "category", "timeZone", "nextDay");
        };
    for (String name : request.getParameterMap().keySet()) {
      if (!allowed.contains(name)
          || request.getParameterValues(name).length != 1
          || request.getParameter(name).isBlank()) throw invalid();
    }
    String page = request.getParameter("page");
    // Spring's numeric converter accepts hex and removes internal whitespace; the wire uses
    // decimal.
    if (page != null && !page.matches("[0-9]+")) throw invalid();
    String season = request.getParameter("seasonId");
    try {
      if (season != null && !UUID.fromString(season).toString().equalsIgnoreCase(season))
        throw invalid();
      if (shape == QueryShape.CALENDAR
          && !ZoneId.getAvailableZoneIds().contains(request.getParameter("timeZone")))
        throw invalid();
    } catch (IllegalArgumentException invalid) {
      throw invalid();
    }
  }

  /** Creates an opaque canonical validation refusal without retaining rejected query data. */
  private static ResponseStatusException invalid() {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST);
  }

  /** The three existing query shapes; options and public counts share the empty member shape. */
  public enum QueryShape {
    MEMBER,
    LIST,
    CALENDAR
  }
}
