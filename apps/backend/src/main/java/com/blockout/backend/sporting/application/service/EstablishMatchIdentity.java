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
    if (pool.classification() == null)
      throw new UnresolvedSportingIdentityException("Pool has no accepted classification");
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

  /**
   * Resolves the source-specific key or its explicit scoped alias before permitting creation.
   *
   * @param pool current locked context
   * @param candidate attributable calendar participant
   * @param expectedTeam existing participant that cannot be silently replaced, or null
   * @return established participant
   */
  private TeamView resolveTeam(PoolView pool, TeamCandidate candidate, UUID expectedTeam) {
    String name = new TeamName(candidate.sourceName()).comparisonKey();
    UUID clubId = null;
    Optional<TeamView> known;
    if (pool.key().provider() == CollectionProviderEnum.FFVB) {
      if (candidate.clubReference() == null || candidate.clubReference().isBlank()) {
        throw new UnresolvedSportingIdentityException("FFVB participant has no attributable club");
      }
      ClubView club =
          store.club(CollectionProviderEnum.FFVB, candidate.clubReference()).orElse(null);
      if (club == null && expectedTeam != null) {
        throw new UnresolvedSportingIdentityException(
            "Known participant has an unrecognized club reference");
      }
      if (club == null)
        club =
            store.createClub(
                CollectionProviderEnum.FFVB, candidate.clubReference(), candidate.clubSourceName());
      clubId = club.id();
      known = store.ffvbTeam(pool.key().seasonId(), clubId, pool.classification(), name);
      if (known.isEmpty()) known = store.teamAlias(pool, clubId, name);
    } else {
      if (candidate.nativeReference() == null || candidate.nativeReference().isBlank()) {
        throw new UnresolvedSportingIdentityException(
            "LNV participant has no native team reference");
      }
      known = store.lnvTeam(pool, candidate.nativeReference());
    }
    if (expectedTeam != null
        && (known.isEmpty() || !known.orElseThrow().id().equals(expectedTeam))) {
      throw new UnresolvedSportingIdentityException(
          "Known encounter has an unrecognized participant");
    }
    if (known.isPresent() && !known.orElseThrow().classification().equals(pool.classification())) {
      throw new UnresolvedSportingIdentityException(
          "Team participation has an incompatible classification");
    }
    return known.isPresent()
        ? known.orElseThrow()
        : store.createTeam(pool, clubId, candidate, name);
  }
}
