package com.blockout.backend.search.api;

import com.blockout.backend.search.application.SearchContext;
import com.blockout.backend.search.application.SearchContinuation;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/**
 * Mode and cursor integration for generated discovery adapters; ordinary MVC owns query binding.
 * Shared access admission stays external.
 */
@Component
@RequiredArgsConstructor
public class DiscoveryRequest {
  private final JsonMapper json;

  /**
   * Selects textual or retained-example mode after ordinary generated MVC binding.
   *
   * @param context current normalized selection
   * @param cursor optional encoded native position, forbidden in example mode
   * @param exampleIds optional distinct generated identities in native supplied order
   * @return detached example selection or decoded position
   * @throws ResponseStatusException for malformed cursors or incompatible request modes
   */
  public Bound bind(SearchContext context, String cursor, Set<UUID> exampleIds) {
    if (exampleIds != null
        && (!context.examples()
            || cursor != null
            || exampleIds.isEmpty()
            || exampleIds.contains(null))) throw invalid();
    if (cursor != null && context.examples()) throw invalid();
    return new Bound(
        context,
        exampleIds == null ? null : List.copyOf(exampleIds),
        cursor == null ? null : decode(cursor));
  }

  /**
   * Encodes a consumed native sort boundary; it is a position, never an access credential.
   *
   * @param continuation score/identity boundary consumed by an adapter
   * @return URL-safe ordinary JSON continuation
   */
  public String encode(SearchContinuation continuation) {
    return Base64.getUrlEncoder()
        .withoutPadding()
        .encodeToString(json.writeValueAsBytes(continuation));
  }

  /**
   * Reads an ordinary native position; reusing it under other criteria may skip results.
   *
   * @param cursor opaque wire input
   * @return validated native boundary
   * @throws ResponseStatusException for malformed input or invalid sort values
   */
  private SearchContinuation decode(String cursor) {
    try {
      SearchContinuation value =
          json.readValue(Base64.getUrlDecoder().decode(cursor), SearchContinuation.class);
      if (value == null
          || value.score() == null
          || !Double.isFinite(value.score())
          || value.score() < 0
          || value.id() == null) throw invalid();
      return value;
    } catch (IllegalArgumentException | JacksonException exception) {
      throw invalid();
    }
  }

  /** Creates the existing safe 400 profile without retaining rejected values. */
  private static ResponseStatusException invalid() {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST);
  }

  /** Detached request values; absent examples remain distinct from an invalid empty selection. */
  public record Bound(
      SearchContext context, List<UUID> exampleIds, SearchContinuation continuation) {}
}
