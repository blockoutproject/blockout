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
import com.blockout.backend.search.application.SearchPage;
import com.blockout.backend.search.application.SearchUnavailableException;
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
  public ResponseEntity<ClubSearchResponse> listClubs(String q, String cursor, Boolean bypass) {
    SearchContext context =
        new SearchContext(
            SearchContext.Resource.CLUB, q, null, null, null, null, Boolean.TRUE.equals(bypass));
    SearchPage page = read(context, cursor);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toClubDto(page, requests.encode(page.next())));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<TeamSearchResponse> listTeams(
      String q,
      String cursor,
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
    SearchPage page = read(context, cursor);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toTeamDto(page, requests.encode(page.next())));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<PoolSearchResponse> listPools(
      String q,
      String cursor,
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
    SearchPage page = read(context, cursor);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toPoolDto(page, requests.encode(page.next())));
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

  private SearchPage read(SearchContext context, String cursor) {
    return reads.read(context, requests.bind(context, cursor));
  }
}
