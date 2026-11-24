package com.blockout.backend.search.api;

import com.blockout.backend.search.application.SearchContext;
import com.blockout.backend.search.application.SearchEngine.Position;
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
   * Decodes only the native position. Reusing the cursor under other criteria may skip results.
   *
   * @param context current normalized selection
   * @param cursor optional encoded native position, forbidden in example mode
   * @return decoded position, or null for a first textual page or current examples
   * @throws ResponseStatusException for malformed cursors or incompatible request modes
   */
  public Position bind(SearchContext context, String cursor) {
    if (cursor == null) {
      return null;
    }
    if (context.examples()) {
      throw invalid();
    }
    try {
      Position value = json.readValue(Base64.getUrlDecoder().decode(cursor), Position.class);
      if (value == null
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

  /**
   * Encodes only the last consumed native position. The cursor grants no access.
   *
   * @param position consumed boundary, or null for a page without continuation
   * @return URL-safe JSON continuation, or null when the position is absent
   */
  public String encode(Position position) {
    return position == null
        ? null
        : Base64.getUrlEncoder().withoutPadding().encodeToString(json.writeValueAsBytes(position));
  }

  /** Creates the existing safe 400 profile without retaining rejected values. */
  private static ResponseStatusException invalid() {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST);
  }
}
