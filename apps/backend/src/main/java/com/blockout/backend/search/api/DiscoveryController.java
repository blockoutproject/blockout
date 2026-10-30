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
import com.blockout.backend.search.application.ReadSearchOptions;
import com.blockout.backend.search.application.SearchContext;
import com.blockout.backend.search.application.SearchContinuation;
import com.blockout.backend.search.application.SearchEngine;
import com.blockout.backend.search.application.SearchExamples;
import com.blockout.backend.search.application.SearchPage;
import com.blockout.backend.search.application.SearchUnavailableException;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.TransactionException;
import org.springframework.web.bind.annotation.RestController;

/** Generated discovery collections after the shared F12 security/filter admission. */
@RestController
@RequiredArgsConstructor
@Slf4j
public class DiscoveryController implements DiscoveryApi {
  private final ReadSearch reads;
  private final ReadSearchOptions options;
  private final DiscoveryRequest requests;
  private final DiscoveryApiMapper mapper;

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
        .body(mapper.toClubDto(page, cursor(page)));
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
        .body(mapper.toTeamDto(page, cursor(page)));
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
        .body(mapper.toPoolDto(page, cursor(page)));
  }

  /**
   * {@inheritDoc}
   *
   * <p>Translates current-read failures around the application transaction, including acquisition
   * and completion, without exposing storage diagnostics.
   */
  @Override
  public ResponseEntity<SportingSearchOptionsResponse> getSportingSearchOptions(
      SearchResourceTypeEnum resourceType, Boolean bypass) {
    try {
      return ResponseEntity.ok()
          .cacheControl(CacheControl.noStore())
          .body(mapper.toDto(options.read(resourceType)));
    } catch (DataAccessException | TransactionException failure) {
      log.atError()
          .addKeyValue("operation", "search_options")
          .addKeyValue("outcome", "unavailable")
          .addKeyValue("error.type", failure.getClass().getName())
          .log("Current search options unavailable");
      throw new SearchUnavailableException(failure);
    }
  }

  /**
   * Validates the canonical mode before current text or example orchestration.
   *
   * @param context admitted current selection
   * @param cursor optional encoded boundary
   * @param exampleIds retained selection, forbidden for textual search
   * @return current collection, with no pagination for examples
   */
  private SearchPage read(SearchContext context, String cursor, Set<UUID> exampleIds) {
    DiscoveryRequest.Bound bound = requests.bind(context, cursor, exampleIds);
    if (bound.exampleIds() != null)
      return reads.examples(context, new SearchExamples(bound.exampleIds()));
    SearchContinuation continuation = bound.continuation();
    return reads.read(
        context,
        continuation == null
            ? null
            : new SearchEngine.Position(continuation.score(), continuation.id()));
  }

  /**
   * Encodes only the consumed native boundary; it grants no authority.
   *
   * @param page completed current page
   * @return ordinary opaque continuation, or null at exhaustion
   */
  private String cursor(SearchPage page) {
    return page.next() == null
        ? null
        : requests.encode(new SearchContinuation(page.next().score(), page.next().id()));
  }
}
