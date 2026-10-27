package com.blockout.backend.search.api;

import com.blockout.backend.search.application.SearchContext;
import com.blockout.backend.search.application.SearchContinuation;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/**
 * Cross-parameter binding for generated discovery adapters; shared access admission stays external.
 */
@Component
public class DiscoveryRequest {
  private final JsonMapper json;

  /**
   * Uses the existing strict HTTP mapper for ordinary cursor serialization.
   *
   * @param json configured application mapper
   */
  public DiscoveryRequest(JsonMapper json) {
    this.json = json;
  }

  /**
   * Rejects undeclared/repeated scalar parameters, malformed continuations and incompatible modes.
   * Generated Bean Validation owns individual parameter shapes; raw repeated IDs remain visible
   * here.
   *
   * @param request native request before Spring's Set binding can discard duplicate identities
   * @param context immutable selection after shared access admission
   * @param cursor optional encoded continuation
   * @param exampleIds optional generated identities, retained in their supplied order
   * @return detached request values with a validated continuation
   * @throws ResponseStatusException for a bad request without exposing query or cursor content
   */
  public Bound bind(
      HttpServletRequest request, SearchContext context, String cursor, Set<UUID> exampleIds) {
    Set<String> allowed =
        context.resource() == SearchContext.Resource.CLUB
            ? Set.of("q", "cursor", "exampleIds")
            : Set.of("q", "cursor", "exampleIds", "seasonId", "divisionId", "format", "gender");
    for (String parameter : request.getParameterMap().keySet()) {
      if (!allowed.contains(parameter)
          || (!parameter.equals("exampleIds") && request.getParameterValues(parameter).length != 1))
        throw invalid();
    }
    validateIdentity(request.getParameter("seasonId"), context.seasonId());
    validateIdentity(request.getParameter("divisionId"), context.divisionId());
    if (exampleIds != null) {
      String[] raw = request.getParameterValues("exampleIds");
      if (!context.examples() || cursor != null || raw == null || raw.length != exampleIds.size())
        throw invalid();
      // Reject comma-separated/coerced UUID forms; the contract requires repeated distinct UUIDs.
      for (String value : raw) {
        if (exampleIds.stream()
            .noneMatch(id -> id != null && id.toString().equalsIgnoreCase(value))) throw invalid();
      }
    }
    if (cursor != null && context.examples()) throw invalid();
    return new Bound(
        context,
        exampleIds == null ? null : List.copyOf(exampleIds),
        cursor == null ? null : decode(cursor, context));
  }

  /**
   * Rejects undeclared or repeated options parameters; shared binding owns exact enum values.
   *
   * @param request native options request
   * @throws ResponseStatusException for missing, unknown or repeated query parameters
   */
  public void validateOptions(HttpServletRequest request) {
    if (!request.getParameterMap().keySet().equals(Set.of("resourceType"))
        || request.getParameterValues("resourceType").length != 1) throw invalid();
  }

  /**
   * Encodes a consumed native sort boundary; it is a position, never an access credential.
   *
   * @param continuation context and score/identity boundary consumed by an adapter
   * @return URL-safe ordinary JSON continuation
   */
  public String encode(SearchContinuation continuation) {
    return Base64.getUrlEncoder()
        .withoutPadding()
        .encodeToString(json.writeValueAsBytes(continuation));
  }

  /**
   * Reads a cursor only for its original selection; malformed or non-finite sort values are
   * invalid.
   *
   * @param cursor opaque wire input
   * @param context current admitted selection
   * @return validated native boundary
   */
  private SearchContinuation decode(String cursor, SearchContext context) {
    try {
      SearchContinuation value =
          json.readValue(Base64.getUrlDecoder().decode(cursor), SearchContinuation.class);
      if (value == null
          || !context.equals(value.context())
          || value.score() == null
          || !Double.isFinite(value.score())
          || value.score() < 0
          || value.id() == null) throw invalid();
      return value;
    } catch (IllegalArgumentException | JacksonException exception) {
      throw invalid();
    }
  }

  /**
   * Preserves UUID shape where Spring otherwise treats blanks as absent or accepts shortened UUIDs.
   *
   * @param raw supplied wire value, null only when omitted
   * @param identity UUID produced by native binding
   */
  private static void validateIdentity(String raw, UUID identity) {
    if (raw != null && (identity == null || !identity.toString().equalsIgnoreCase(raw)))
      throw invalid();
  }

  /** Creates the existing safe 400 profile without retaining rejected values. */
  private static ResponseStatusException invalid() {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST);
  }

  /** Detached request values; absent examples remain distinct from an invalid empty selection. */
  public record Bound(
      SearchContext context, List<UUID> exampleIds, SearchContinuation continuation) {}
}
