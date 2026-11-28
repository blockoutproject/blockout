package com.blockout.backend.access.api;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** One canonical parser shared by HTTP admission and F05's existing account admission binding. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class MaintenanceBypass {
  /**
   * Reads explicit personal intent without accepting Spring's broader boolean conversion syntax.
   *
   * @param request backend request; absence and literal false request no bypass
   * @return whether the single header value is exactly true; this grants no authorization
   * @throws ResponseStatusException with status 400 for noncanonical or repeated values
   */
  public static boolean requested(HttpServletRequest request) {
    List<String> values = Collections.list(request.getHeaders("Blockout-Maintenance-Bypass"));
    if (values.size() > 1
        || values.stream().anyMatch(value -> !Set.of("true", "false").contains(value))) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
    }
    return values.equals(List.of("true"));
  }
}
