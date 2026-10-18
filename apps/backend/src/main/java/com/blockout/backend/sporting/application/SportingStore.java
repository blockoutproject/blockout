package com.blockout.backend.sporting.application;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.sporting.application.SportingViews.ClubView;
import com.blockout.backend.sporting.application.SportingViews.DivisionView;
import com.blockout.backend.sporting.application.SportingViews.MatchView;
import com.blockout.backend.sporting.application.SportingViews.PoolView;
import com.blockout.backend.sporting.application.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.SportingViews.TeamView;
import java.util.Optional;
import java.util.UUID;

/** Application-owned identity operations; managed entities never cross this port. */
public interface SportingStore {
  /**
   * Finds a canonical season by its qualified start year.
   *
   * @param year qualified start year
   * @return existing canonical identity
   */
  Optional<SeasonView> seasonByYear(long year);

  /**
   * Creates the canonical season without acquisition lifecycle changes.
   *
   * @param year qualified start year
   * @param label canonical label
   * @return created season
   */
  SeasonView createSeason(long year, String label);

  /**
   * Reads a canonical season identity.
   *
   * @param id established season
   * @return canonical identity
   */
  Optional<SeasonView> season(UUID id);

  /**
   * Holds the existing season row through the caller-owned write transaction.
   *
   * @param id established season to lock through the caller's write transaction
   */
  void lockSeason(UUID id);

  /**
   * Locks the pool's canonical season before loading mutable sporting state.
   *
   * @param poolId established contextual pool
   */
  void lockPoolSeason(UUID poolId);

  /**
   * Reads the minimal division state and its controlled discovery terms.
   *
   * @param id division identity
   * @return current minimal classification owner
   */
  Optional<DivisionView> division(UUID id);

  /**
   * Finds the exact native compound pool context.
   *
   * @param key qualified compound identity
   * @return established pool
   */
  Optional<PoolView> pool(PoolKey key);

  /**
   * Reads the established pool identity.
   *
   * @param id pool identity
   * @return established pool
   */
  Optional<PoolView> pool(UUID id);

  /**
   * Creates the pool and reuses its native grouping in the locked season.
   *
   * @param key qualified compound identity
   * @param packReference native grouping
   * @param sourceName attributable label
   * @param classification accepted complete classification
   * @return established pool
   */
  PoolView createPool(
      PoolKey key, String packReference, String sourceName, SportingClassification classification);

  /**
   * Finds a persistent organization by its exact provider reference.
   *
   * @param provider reference owner
   * @param reference exact native reference
   * @return persistent club
   */
  Optional<ClubView> club(CollectionProviderEnum provider, String reference);

  /**
   * Reads the persistent organization.
   *
   * @param id persistent club identity
   * @return available organization data
   */
  Optional<ClubView> club(UUID id);

  /**
   * Creates an attributable organization without waiting for page details.
   *
   * @param provider reference owner
   * @param reference exact reference
   * @param sourceName available label
   * @return new club
   */
  ClubView createClub(CollectionProviderEnum provider, String reference, String sourceName);

  /**
   * Finds the existing FFVB club/classification/name identity.
   *
   * @param seasonId seasonal context
   * @param clubId established club
   * @param classification complete sporting context
   * @param name comparison key
   * @return matching FFVB team
   */
  Optional<TeamView> ffvbTeam(
      UUID seasonId, UUID clubId, SportingClassification classification, String name);

  /**
   * Resolves only the explicitly qualified current alias.
   *
   * @param pool qualified alias context
   * @param clubId established club
   * @param name exact normalized alias
   * @return explicitly associated team
   */
  Optional<TeamView> teamAlias(PoolView pool, UUID clubId, String name);

  /**
   * Finds the native professional identity in its championship.
   *
   * @param pool qualified championship context
   * @param reference native TeamID
   * @return matching professional team
   */
  Optional<TeamView> lnvTeam(PoolView pool, String reference);

  /**
   * Reads the established seasonal team.
   *
   * @param id seasonal team identity
   * @return detached team
   */
  Optional<TeamView> team(UUID id);

  /**
   * Creates one identified calendar participant under the locked season.
   *
   * @param pool established pool
   * @param clubId attributable club or null for LNV
   * @param candidate identified participant
   * @param comparisonName narrow normalized name
   * @return created team
   */
  TeamView createTeam(PoolView pool, UUID clubId, TeamCandidate candidate, String comparisonName);

  /**
   * Refreshes only the original source label.
   *
   * @param id existing team
   * @param sourceName current attributable label; never a manual presentation value
   */
  void updateTeamSourceName(UUID id, String sourceName);

  /**
   * Retains one unique compatible team/pool relation.
   *
   * @param teamId established team
   * @param poolId compatible established pool
   */
  void participate(UUID teamId, UUID poolId);

  /**
   * Finds the native encounter within its pool.
   *
   * @param poolId qualified pool
   * @param reference native match code
   * @return existing encounter
   */
  Optional<MatchView> match(UUID poolId, String reference);

  /**
   * Reads the stable encounter identity.
   *
   * @param id match identity
   * @return detached encounter identity
   */
  Optional<MatchView> match(UUID id);

  /**
   * Creates the encounter from already established participants.
   *
   * @param poolId qualified pool
   * @param reference native code
   * @param homeTeamId established home team
   * @param awayTeamId established away team
   * @return created encounter
   */
  MatchView createMatch(UUID poolId, String reference, UUID homeTeamId, UUID awayTeamId);
}
