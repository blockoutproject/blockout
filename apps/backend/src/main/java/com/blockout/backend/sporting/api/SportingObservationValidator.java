package com.blockout.backend.sporting.api;

import com.blockout.backend.generated.ingestion.model.CalendarObservationInternalRequest;
import com.blockout.backend.generated.ingestion.model.CatalogObservationInternalRequest;
import java.net.URI;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Cross-collection limit that cannot be expressed by each generated array's maxItems. */
@Component
public class SportingObservationValidator {
  /**
   * Refuses oversized combined input before any application write, without truncation.
   *
   * @param request already structurally validated generated calendar
   */
  public void calendar(CalendarObservationInternalRequest request) {
    request.getMatches().forEach(match -> reference(match.getDetailUrl()));
    if ((long) request.getMatches().size()
            + request.getContextSlots().size()
            + request.getFailures().size()
        > 1000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  }

  /**
   * Qualifies catalog entry references before its atomic application transaction.
   *
   * @param request structurally valid catalog
   */
  public void catalog(CatalogObservationInternalRequest request) {
    request
        .getPools()
        .forEach(
            pool -> {
              reference(pool.getCalendarUrl());
              reference(pool.getStandingsUrl());
            });
  }

  /**
   * Refuses credentials and non-HTTP locators; transport origin authorization remains with F01.
   *
   * @param value optional submitted native entry reference
   */
  private void reference(URI value) {
    if (value != null
        && (value.getHost() == null
            || value.getUserInfo() != null
            || !("https".equalsIgnoreCase(value.getScheme())
                || "http".equalsIgnoreCase(value.getScheme()))))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  }
}
