package com.blockout.backend.sporting.application.service;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.sporting.application.exception.UnresolvedSportingIdentityException;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
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
import org.springframework.transaction.annotation.Transactional;

/**
 * Establishes calendar identities under the season lock; admission and field acceptance stay with
 * callers.
 */
@Service
@RequiredArgsConstructor
public class SportingIdentityService {
  private final SportingStore store;

  /**
   * Reuses a qualified native pool; classification corrections require their dedicated command.
   *
   * @param key complete source/season/context identity
   * @param packReference qualified provider grouping
   * @param sourceName attributable label
   * @param classification established complete sporting classification
   * @return existing or newly established pool
   * @throws UnresolvedSportingIdentityException if the season or division is unknown, a new
   *     classification uses an inactive division, or an existing classification would change
   */
  @Transactional
  public PoolView establishPool(
      PoolKey key, String packReference, String sourceName, SportingClassification classification) {
    store.lockSeason(key.seasonId());
    PoolView existing = store.pool(key).orElse(null);
    if (existing != null) {
      if (!existing.classification().equals(classification)) {
        throw new UnresolvedSportingIdentityException(
            "Classification requires an explicit correction");
      }
      return existing;
    }
    if (!store
        .lockDivision(classification.divisionId())
        .orElseThrow(() -> new UnresolvedSportingIdentityException("Unknown division"))
        .active()) {
      throw new UnresolvedSportingIdentityException(
          "Inactive division cannot establish a classification");
    }
    return store.createPool(key, packReference, sourceName, classification);
  }

  /**
   * Establishes one identified calendar encounter atomically. Known participant ambiguity refuses
   * the item; database uniqueness conflicts roll back for a later ordinary collection, without
   * retry. Callers must already hold the F01 runtime fence when this operation is used by
   * ingestion.
   *
   * @param poolId existing qualified pool
   * @param reference native match reference, independent of date and participant pair
   * @param home identified home participant; null represents no identifiable encounter
   * @param away identified away participant; null represents no identifiable encounter
   * @return stable match identity
   * @throws UnresolvedSportingIdentityException if the pool or participants cannot be identified,
   *     participants coincide, or their classification is incompatible
   */
  @Transactional
  public MatchView identifyMatch(
      UUID poolId, String reference, TeamCandidate home, TeamCandidate away) {
    if (home == null || away == null) {
      throw new UnresolvedSportingIdentityException(
          "A future place or bye is not an identified encounter");
    }
    store.lockPoolSeason(poolId);
    PoolView pool = store.pool(poolId).orElseThrow();
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
