package com.blockout.backend.sporting.application;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.sporting.application.SportingViews.ClubView;
import com.blockout.backend.sporting.application.SportingViews.DivisionView;
import com.blockout.backend.sporting.application.SportingViews.MatchView;
import com.blockout.backend.sporting.application.SportingViews.PoolView;
import com.blockout.backend.sporting.application.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.SportingViews.TeamView;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Immutable owner reads for F01/F03/F04/F06; current public eligibility is added by its story. */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class SportingReadService {
  private final SportingStore store;

  /**
   * Reads eligible pool references in bounded owner pages.
   *
   * @param seasonId canonical season held by the admission transaction
   * @param provider designated provider
   * @param initialImport permits qualified historical references absent from the current catalog
   * @param organizerReference qualified source binding
   * @param now admission instant
   * @param page bounded pool page
   * @return eligible current acquisition references, not published classification fallbacks
   */
  public List<AcquisitionReference> acquisitionPools(
      UUID seasonId,
      CollectionProviderEnum provider,
      String organizerReference,
      boolean initialImport,
      Instant now,
      int page) {
    return store.acquisitionPools(seasonId, provider, organizerReference, initialImport, now, page);
  }

  /**
   * Reads qualified detail references in bounded owner pages.
   *
   * @param poolId eligible admitted pool
   * @param now admission instant
   * @param page bounded detail page
   * @return qualified LNV detail references
   */
  public List<AcquisitionReference> acquisitionDetails(UUID poolId, Instant now, int page) {
    return store.acquisitionDetails(poolId, now, page);
  }

  /**
   * Reads seasonless acquisition identities without personal locality.
   *
   * @param geocoding selects municipal needs rather than club sheets
   * @param manual explicit family rerun may revisit ordinary no-result localities
   * @param page bounded owner page
   * @return identities only; permitted locality is resolved when serving targets
   */
  public List<AcquisitionReference> acquisitionClubs(boolean geocoding, boolean manual, int page) {
    return store.acquisitionClubs(geocoding, manual, page);
  }

  /**
   * Resolves currently permitted organization localities in one batch.
   *
   * @param clubIds current organizations from a bounded target page
   * @return permitted context by identity, omitting removed organizations
   */
  public Map<UUID, ClubLocalityView> clubLocalities(List<UUID> clubIds) {
    return store.clubLocalities(clubIds);
  }

  /**
   * Reads a canonical season without lifecycle mutation.
   *
   * @param id canonical season
   * @return current identity
   */
  public Optional<SeasonView> season(UUID id) {
    return store.season(id);
  }

  /**
   * Reads the currently known persistent organization.
   *
   * @param id persistent organization
   * @return current known data
   */
  public Optional<ClubView> club(UUID id) {
    return store.club(id);
  }

  /**
   * Reads current division identity, state and search terms.
   *
   * @param id division owner
   * @return current identity/activity/search terms
   */
  public Optional<DivisionView> division(UUID id) {
    return store.division(id);
  }

  /**
   * Reads the established contextual pool.
   *
   * @param id contextual pool
   * @return current accepted identity/classification
   */
  public Optional<PoolView> pool(UUID id) {
    return store.pool(id);
  }

  /**
   * Reads the seasonal team without exposing persistence.
   *
   * @param id seasonal team
   * @return current identity/classification
   */
  public Optional<TeamView> team(UUID id) {
    return store.team(id);
  }

  /**
   * Reads the native encounter and its established participants.
   *
   * @param id stable encounter
   * @return its current participant identities
   */
  public Optional<MatchView> match(UUID id) {
    return store.match(id);
  }
}
