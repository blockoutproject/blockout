package com.blockout.backend.sporting.application.service;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.sporting.application.exception.UnresolvedSportingIdentityException;
import com.blockout.backend.sporting.application.model.SportingViews.ClubView;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.SportingViews.PoolView;
import com.blockout.backend.sporting.application.model.SportingViews.TeamView;
import com.blockout.backend.sporting.application.model.TeamCandidate;
import com.blockout.backend.sporting.application.port.SportingStore;
import com.blockout.backend.sporting.domain.TeamName;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Establishes calendar identities inside the accepting command's already locked transaction.
 * Admission, root ordering and field acceptance stay with that command.
 */
@Service
@RequiredArgsConstructor
public class EstablishMatchIdentity {
  private final SportingStore store;

  /**
   * Establishes one identified calendar encounter atomically. Known participant ambiguity refuses
   * the item; database uniqueness conflicts roll back for a later ordinary collection, without
   * retry. The accepting caller already holds its F01 runtime fence, season, current division and
   * any existing match lock in owner order. This participant acquires no earlier root afterward.
   *
   * @param poolId existing qualified pool
   * @param reference native match reference, independent of date and participant pair
   * @param home identified home participant; null represents no identifiable encounter
   * @param away identified away participant; null represents no identifiable encounter
   * @return stable match identity
   * @throws UnresolvedSportingIdentityException if the pool or participants cannot be identified,
   *     participants coincide, or their classification is incompatible
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public MatchView identifyMatch(
      UUID poolId, String reference, TeamCandidate home, TeamCandidate away) {
    if (home == null || away == null) {
      throw new UnresolvedSportingIdentityException(
          "A future place or bye is not an identified encounter");
    }
    PoolView pool = store.pool(poolId).orElseThrow();
    if (pool.classification() == null) {
      throw new UnresolvedSportingIdentityException("Pool has no accepted classification");
    }
    MatchView existing = store.match(poolId, reference).orElse(null);
    TeamView homeTeam = resolveTeam(pool, home, existing == null ? null : existing.homeTeamId());
    TeamView awayTeam = resolveTeam(pool, away, existing == null ? null : existing.awayTeamId());
    if (homeTeam.id().equals(awayTeam.id())) {
      throw new UnresolvedSportingIdentityException("An encounter needs two distinct teams");
    }
    store.updateTeamSourceName(homeTeam.id(), home.sourceName());
    store.updateTeamSourceName(awayTeam.id(), away.sourceName());
    store.participate(homeTeam.id(), poolId);
    store.participate(awayTeam.id(), poolId);
    return existing == null
        ? store.createMatch(poolId, reference, homeTeam.id(), awayTeam.id())
        : existing;
  }

  private TeamView resolveTeam(PoolView pool, TeamCandidate candidate, UUID expectedTeam) {
    String name = new TeamName(candidate.sourceName()).comparisonKey();
    return switch (pool.key().provider()) {
      case FFVB -> resolveFfvbTeam(pool, candidate, name, expectedTeam);
      case LNV -> resolveLnvTeam(pool, candidate, name, expectedTeam);
    };
  }

  /** Uses the club, season, classification and comparison name secured by {@code uk_team_ffvb}. */
  private TeamView resolveFfvbTeam(
      PoolView pool, TeamCandidate candidate, String name, UUID expectedTeam) {
    if (candidate.clubReference() == null || candidate.clubReference().isBlank()) {
      throw new UnresolvedSportingIdentityException("FFVB participant has no attributable club");
    }
    Optional<ClubView> knownClub =
        store.club(CollectionProviderEnum.FFVB, candidate.clubReference());
    if (knownClub.isEmpty() && expectedTeam != null) {
      throw new UnresolvedSportingIdentityException(
          "Known participant has an unrecognized club reference");
    }
    UUID clubId =
        knownClub
            .orElseGet(
                () ->
                    store.createClub(
                        CollectionProviderEnum.FFVB,
                        candidate.clubReference(),
                        candidate.clubSourceName()))
            .id();
    Optional<TeamView> known =
        store
            .ffvbTeam(pool.key().seasonId(), clubId, pool.classification(), name)
            .or(() -> store.teamAlias(pool, clubId, name));
    return retainOrCreateTeam(pool, candidate, name, expectedTeam, clubId, known.orElse(null));
  }

  /** Uses the season, organizer, competition and native TeamID secured by {@code uk_team_lnv}. */
  private TeamView resolveLnvTeam(
      PoolView pool, TeamCandidate candidate, String name, UUID expectedTeam) {
    if (candidate.nativeReference() == null || candidate.nativeReference().isBlank()) {
      throw new UnresolvedSportingIdentityException("LNV participant has no native team reference");
    }
    TeamView knownTeam = store.lnvTeam(pool, candidate.nativeReference()).orElse(null);
    return retainOrCreateTeam(pool, candidate, name, expectedTeam, null, knownTeam);
  }

  /** Guards retained participants and their classification before any new team can be created. */
  private TeamView retainOrCreateTeam(
      PoolView pool,
      TeamCandidate candidate,
      String name,
      UUID expectedTeam,
      UUID clubId,
      TeamView knownTeam) {
    if (expectedTeam != null && (knownTeam == null || !expectedTeam.equals(knownTeam.id()))) {
      throw new UnresolvedSportingIdentityException(
          "Known encounter has an unrecognized participant");
    }
    if (knownTeam != null && !knownTeam.classification().equals(pool.classification())) {
      throw new UnresolvedSportingIdentityException(
          "Team participation has an incompatible classification");
    }
    return knownTeam == null ? store.createTeam(pool, clubId, candidate, name) : knownTeam;
  }
}
