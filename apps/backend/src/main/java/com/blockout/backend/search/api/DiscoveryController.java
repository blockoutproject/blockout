package com.blockout.backend.search.api;

import com.blockout.backend.generated.mobile.api.DiscoveryApi;
import com.blockout.backend.generated.mobile.model.ClubSearchResponse;
import com.blockout.backend.generated.mobile.model.PoolSearchResponse;
import com.blockout.backend.generated.mobile.model.SearchResourceTypeEnum;
import com.blockout.backend.generated.mobile.model.SportFormatEnum;
import com.blockout.backend.generated.mobile.model.SportGenderEnum;
import com.blockout.backend.generated.mobile.model.SportingSearchOptionsResponse;
import com.blockout.backend.generated.mobile.model.TeamSearchResponse;
import com.blockout.backend.search.application.ReadSearch;
import com.blockout.backend.search.application.SearchContext;
import com.blockout.backend.search.application.SearchContinuation;
import com.blockout.backend.search.application.SearchEngine;
import com.blockout.backend.search.application.SearchPage;
import com.blockout.backend.sporting.api.ConsultationApiMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Generated textual collections after the shared F12 security/filter admission. */
@RestController
@RequiredArgsConstructor
public class DiscoveryController implements DiscoveryApi {
  private final ReadSearch reads;
  private final DiscoveryRequest requests;
  private final DiscoveryApiMapper mapper;
  private final ConsultationApiMapper sporting;
  private final HttpServletRequest request;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ClubSearchResponse> listClubs(
      String q, String cursor, Set<UUID> exampleIds, Boolean bypass) {
    SearchContext context =
        new SearchContext(
            SearchContext.Resource.CLUB, q, null, null, null, null, Boolean.TRUE.equals(bypass));
    SearchPage page = read(context, cursor, exampleIds);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            new ClubSearchResponse(
                    page.items().stream().map(item -> mapper.toResponse(item.club())).toList())
                .nextCursor(cursor(context, page)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<TeamSearchResponse> listTeams(
      String q,
      String cursor,
      Set<UUID> exampleIds,
      UUID seasonId,
      UUID divisionId,
      SportFormatEnum format,
      SportGenderEnum gender,
      Boolean bypass) {
    SearchContext context =
        new SearchContext(
            SearchContext.Resource.TEAM,
            q,
            seasonId,
            divisionId,
            format,
            gender,
            Boolean.TRUE.equals(bypass));
    SearchPage page = read(context, cursor, exampleIds);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            new TeamSearchResponse(
                    page.items().stream().map(item -> sporting.toResponse(item.team())).toList())
                .nextCursor(cursor(context, page)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<PoolSearchResponse> listPools(
      String q,
      String cursor,
      Set<UUID> exampleIds,
      UUID seasonId,
      UUID divisionId,
      SportFormatEnum format,
      SportGenderEnum gender,
      Boolean bypass) {
    SearchContext context =
        new SearchContext(
            SearchContext.Resource.POOL,
            q,
            seasonId,
            divisionId,
            format,
            gender,
            Boolean.TRUE.equals(bypass));
    SearchPage page = read(context, cursor, exampleIds);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            new PoolSearchResponse(
                    page.items().stream().map(item -> sporting.toResponse(item.pool())).toList())
                .nextCursor(cursor(context, page)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<SportingSearchOptionsResponse> getSportingSearchOptions(
      SearchResourceTypeEnum resourceType, Boolean bypass) {
    requests.validateOptions(request);
    // Current options are delivered by the separately owned US3 increment.
    throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
  }

  /**
   * Validates the canonical mode before textual orchestration; examples have their own owner.
   *
   * @param context admitted current selection
   * @param cursor optional encoded boundary
   * @param exampleIds retained selection, forbidden for textual search
   * @return current textual page
   */
  private SearchPage read(SearchContext context, String cursor, Set<UUID> exampleIds) {
    DiscoveryRequest.Bound bound = requests.bind(request, context, cursor, exampleIds);
    if (context.examples()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
    SearchContinuation continuation = bound.continuation();
    return reads.read(
        context,
        continuation == null
            ? null
            : new SearchEngine.Position(continuation.score(), continuation.id()));
  }

  /**
   * Encodes only the consumed native boundary for this exact admitted selection.
   *
   * @param context current normalized selection and admission intent
   * @param page completed current page
   * @return ordinary opaque continuation, or null at exhaustion
   */
  private String cursor(SearchContext context, SearchPage page) {
    return page.next() == null
        ? null
        : requests.encode(new SearchContinuation(context, page.next().score(), page.next().id()));
  }
}
