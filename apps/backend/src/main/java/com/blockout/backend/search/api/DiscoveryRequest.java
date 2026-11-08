package com.blockout.backend.search.api;

import com.blockout.backend.search.application.SearchContext;
import com.blockout.backend.search.application.SearchContinuation;
import java.util.Base64;
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
   * Binds an optional textual continuation after ordinary generated MVC query binding.
   *
   * @param context current normalized selection
   * @param cursor optional encoded native position, forbidden in example mode
   * @return decoded position, or null for a first textual page or current examples
   * @throws ResponseStatusException for malformed cursors or incompatible request modes
   */
  public SearchContinuation bind(SearchContext context, String cursor) {
    if (cursor != null && context.examples()) {
      throw invalid();
    }
    return cursor == null ? null : decode(cursor);
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
          || value.id() == null) {
        throw invalid();
      }
      return value;
    } catch (IllegalArgumentException | JacksonException exception) {
      throw invalid();
    }
  }

  /** Creates the existing safe 400 profile without retaining rejected values. */
  private static ResponseStatusException invalid() {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST);
  }
}
