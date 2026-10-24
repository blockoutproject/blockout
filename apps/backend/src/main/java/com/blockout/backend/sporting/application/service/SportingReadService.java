package com.blockout.backend.sporting.application.service;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Scope;
import com.blockout.backend.sporting.application.model.AcquisitionReference;
import com.blockout.backend.sporting.application.model.ClubLocalityView;
import com.blockout.backend.sporting.application.model.SportingPublicInput;
import com.blockout.backend.sporting.application.model.SportingViews.ClubView;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionResourcePage;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionView;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.SportingViews.PoolView;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.model.SportingViews.TeamView;
import com.blockout.backend.sporting.application.model.SportingVisibility;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.model.StandingsView;
import com.blockout.backend.sporting.application.port.SportingReadStore;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Immutable owner reads for F01 and current public inputs for F03/F04/F06. */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class SportingReadService {
  private final SportingStore store;
  private final SportingReadStore publicReads;

  /**
   * Rechecks current eligibility independently of index documents, follows and old links.
   *
   * @param kind owning resource kind
   * @param id stable identity
   * @return all current restrictions, or empty for an unknown identity
   */
  public Optional<SportingVisibility> visibility(Kind kind, UUID id) {
    return publicReads.visibility(kind, id);
  }

  /**
   * Hydrates bounded current authorized public values; hidden identities are omitted.
   *
   * @param kind club, team or pool
   * @param ids at most 200 stable identities
   * @return immutable current inputs, never stale engine documents
   */
  public List<SportingPublicInput> publicInputs(Kind kind, Set<UUID> ids) {
    if (ids.size() > 200) throw new IllegalArgumentException("At most 200 identities per read");
    return publicReads.publicInputs(kind, ids);
  }

  /**
   * Supplies bounded current inputs for a consumer-owned rebuild in stable UUID order.
   *
   * @param kind club, team or pool
   * @param page zero-based page
   * @param size from 1 through 200
   * @return eligible current inputs; an empty page ends traversal
   */
  public List<SportingPublicInput> projectionInputs(Kind kind, int page, int size) {
    if (page < 0 || size < 1 || size > 200)
      throw new IllegalArgumentException("Invalid page bounds");
    return publicReads.projectionInputs(kind, page, size);
  }

  /**
   * Expands affected sporting identities without filtering hidden resources needing index removal.
   *
   * @param scopes changed owner identities/scopes from an after-commit request
   * @return immutable dependent club/team/pool identities
   */
  public Set<Scope> projectionDependents(Set<Scope> scopes) {
    return publicReads.projectionDependents(scopes);
  }

  /**
   * Resolves an existing encounter only while its date, pool and participation permit consultation.
   *
   * @param id stable identity from a link or personal follow
   * @return current eligible encounter, without replacement or identity transfer
   */
  public Optional<MatchView> publicMatch(UUID id) {
    return visibility(Kind.MATCH, id)
        .filter(SportingVisibility::viewable)
        .flatMap(ignored -> store.match(id));
  }

  /**
   * Keeps official row order and labels while removing links to currently unavailable participants.
   *
   * @param poolId current pool identity
   * @return authorized retained official table, or empty for a hidden pool or unknown table
   */
  public Optional<StandingsView> publicStandings(UUID poolId) {
    if (visibility(Kind.POOL, poolId).filter(SportingVisibility::viewable).isEmpty())
      return Optional.empty();
    return store
        .standings(poolId)
        .map(
            table -> {
              Set<UUID> eligible = publicReads.viewablePoolTeamIds(poolId);
              return table.toBuilder()
                  .rows(
                      table.rows().stream()
                          .map(
                              row ->
                                  new StandingsView.Row(
                                      row.sourceName(),
                                      row.nativeTeamReference(),
                                      row.position(),
                                      row.statistics(),
                                      row.teamId() != null && eligible.contains(row.teamId())
                                          ? row.teamId()
                                          : null))
                          .toList())
                  .build();
            });
  }

  /**
   * Reads current source children through their sporting owner, without acquisition filtering.
   *
   * @param seasonId canonical source season
   * @param provider designated provider
   * @param organizerReference source organizer or championship
   * @param parentId optional pack owned by this exact source
   * @param page bounded page index
   * @param size bounded page size
   * @return direct children, including unmapped pools
   */
  public CollectionResourcePage collectionChildren(
      UUID seasonId,
      CollectionProviderEnum provider,
      String organizerReference,
      UUID parentId,
      int page,
      int size) {
    return store.collectionChildren(seasonId, provider, organizerReference, parentId, page, size);
  }

  /**
   * Resolves a known team's retained pool memberships for acquisition scope checks.
   *
   * @param teamId stable sporting team
   * @return owning pool identities without exporting persistence entities
   */
  public List<UUID> teamPools(UUID teamId) {
    return store.teamPoolIds(teamId);
  }

  /**
   * Reads eligible pool references in bounded owner pages.
   *
   * @param seasonId canonical season held by the admission transaction
   * @param provider designated provider
   * @param initialImport permits qualified historical references absent from the current catalog
   * @param organizerReference qualified source binding
   * @param now admission instant
   * @param afterId exclusive last visited pool identity, or null for the first batch
   * @return eligible current acquisition references, not published classification fallbacks
   */
  public List<AcquisitionReference> acquisitionPools(
      UUID seasonId,
      CollectionProviderEnum provider,
      String organizerReference,
      boolean initialImport,
      Instant now,
      UUID afterId) {
    return store.acquisitionPools(
        seasonId, provider, organizerReference, initialImport, now, afterId);
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
   * @param afterId exclusive last visited club identity, or null for the first batch
   * @return identities only; permitted locality is resolved when serving targets
   */
  public List<AcquisitionReference> acquisitionClubs(
      boolean geocoding, boolean manual, UUID afterId) {
    return store.acquisitionClubs(geocoding, manual, afterId);
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
   * Reads a retained contextual pool for internal acquisition, including hidden identities.
   *
   * @param id contextual pool
   * @return current accepted identity/classification
   */
  public Optional<PoolView> pool(UUID id) {
    return store.pool(id);
  }

  /**
   * Reads a retained seasonal team for internal acquisition, including hidden identities.
   *
   * @param id seasonal team
   * @return current identity/classification
   */
  public Optional<TeamView> team(UUID id) {
    return store.team(id);
  }

  /**
   * Reads a retained encounter for internal acquisition, including hidden or dateless identities.
   *
   * @param id stable encounter
   * @return its current participant identities
   */
  public Optional<MatchView> match(UUID id) {
    return store.match(id);
  }

  /**
   * Resolves an encounter's retained pool for acquisition scope checks.
   *
   * @param id stable encounter
   * @return owning pool identity, or empty when the encounter is unknown
   */
  public Optional<UUID> matchPoolId(UUID id) {
    return store.matchPoolId(id);
  }
}
