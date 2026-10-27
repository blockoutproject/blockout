package com.blockout.backend.sporting.application.service;

import com.blockout.backend.generated.mobile.model.TeamLogoSelectionEnum;
import com.blockout.backend.sporting.application.SportingProjectionChanges;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Scope;
import com.blockout.backend.sporting.application.model.SportingModelMapper;
import com.blockout.backend.sporting.application.model.SportingPresentation;
import com.blockout.backend.sporting.application.model.SportingPublicInput;
import com.blockout.backend.sporting.application.model.SportingViews.ClubView;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionView;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.model.SportingViews.TeamView;
import com.blockout.backend.sporting.application.model.SportingVisibility;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.model.StandingsView;
import com.blockout.backend.sporting.application.port.SportingReadStore;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.util.Collections;
import java.util.EnumMap;
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
public class ReadSportingData {
  private final SportingStore store;
  private final SportingModelMapper mapper;
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
   * Reads current filter seasons directly from sporting visibility, independently of an index.
   *
   * @param kind TEAM or POOL
   * @return distinct canonical seasons newest first, including viewable closed seasons
   */
  public List<SeasonView> publicSeasons(Kind kind) {
    return publicReads.viewableSeasons(kind);
  }

  /**
   * Reads all active divisions independently of the current result set.
   *
   * @return effective division presentation ordered by case-folded name, then UUID
   */
  public List<DivisionDetail> publicDivisions() {
    return store.divisions(false);
  }

  /**
   * Reads current club seasons directly from eligible sporting teams, independently of search.
   *
   * @param clubId exact organization
   * @return distinct canonical seasons newest first, including viewable closed seasons
   */
  public List<SeasonView> publicClubSeasons(UUID clubId) {
    return publicReads.viewableClubSeasons(clubId);
  }

  /**
   * Reads all eligible teams in an exact club season without the search hydration batch limit.
   *
   * @param clubId exact organization already admitted by the caller
   * @param seasonId explicit canonical season
   * @return current team identities within the caller's existing club/season read transaction
   */
  public List<TeamView> publicClubTeams(UUID clubId, UUID seasonId) {
    return publicReads.viewableClubTeams(clubId, seasonId);
  }

  /**
   * Reads current viewable participation identities independently of search presentation.
   *
   * @param teamId exact seasonal team already admitted by the caller
   * @return currently visible pool identities in stable UUID order
   */
  public List<UUID> publicTeamPoolIds(UUID teamId) {
    return publicReads.viewableTeamPoolIds(teamId);
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
                                  mapper.toRow(
                                      row,
                                      row.teamId() != null && eligible.contains(row.teamId())
                                          ? row.teamId()
                                          : null))
                          .toList())
                  .build();
            });
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
   * Reads current names and effective artwork only while the addressed sporting owner is viewable.
   *
   * @param kind club, team or pool
   * @param id stable owner
   * @return current detached presentation, or empty for a hidden/unknown owner
   */
  public Optional<SportingPresentation.View> publicPresentation(Kind kind, UUID id) {
    return visibility(kind, id)
        .filter(SportingVisibility::viewable)
        .flatMap(ignored -> store.presentation(mapper.toProjectionKind(kind), id));
  }

  /**
   * Supplies effective permitted contacts to public consumers without source/manual metadata.
   *
   * @param clubId stable organization
   * @return immutable current field values; restricted and deliberately absent values are null
   */
  public Map<SportingPresentation.ContactField, String> publicClubContacts(UUID clubId) {
    if (visibility(Kind.CLUB, clubId).filter(SportingVisibility::viewable).isEmpty())
      return Map.of();
    Map<SportingPresentation.ContactField, String> result =
        new EnumMap<>(SportingPresentation.ContactField.class);
    store
        .clubContacts(clubId)
        .fields()
        .forEach((field, value) -> result.put(field, value.effectiveValue()));
    return Collections.unmodifiableMap(result);
  }

  /**
   * Supplies the current permitted municipality point; no provider attempt is made here.
   *
   * @param clubId stable organization
   * @return current context and point, or empty for an unknown club
   */
  public Optional<SportingPresentation.Locality> publicLocality(UUID clubId) {
    return visibility(Kind.CLUB, clubId)
        .filter(SportingVisibility::viewable)
        .map(ignored -> store.locality(clubId));
  }

  /**
   * Resolves immutable effective image content under current resource eligibility.
   *
   * @param kind club, team or division
   * @param id stable owner
   * @return actual current bytes, or empty for an unavailable owner or missing image
   */
  public Optional<SportingPresentation.Image> publicLogo(
      SportingProjectionChanges.Kind kind, UUID id) {
    boolean visible =
        kind == SportingProjectionChanges.Kind.DIVISION
            ? store.division(id).filter(DivisionView::active).isPresent()
            : visibility(mapper.toVisibilityKind(kind), id)
                .filter(SportingVisibility::viewable)
                .isPresent();
    return visible ? store.effectiveLogo(kind, id) : Optional.empty();
  }

  /**
   * Supplies selected current team artwork while enforcing the same current public visibility.
   *
   * @param teamId seasonal team
   * @param selection effective or automatic fallback independent of the manual override
   * @return immutable selected bytes, or empty for a hidden/unknown team or missing artwork
   */
  public Optional<SportingPresentation.Image> publicTeamLogo(
      UUID teamId, TeamLogoSelectionEnum selection) {
    return visibility(Kind.TEAM, teamId)
        .filter(SportingVisibility::viewable)
        .flatMap(ignored -> store.teamLogo(teamId, selection));
  }
}
