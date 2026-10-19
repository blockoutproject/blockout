package com.blockout.backend.sporting.application.port;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.sporting.application.exception.SportingConflictException;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.AcquisitionReference;
import com.blockout.backend.sporting.application.model.ClubLocalityView;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingViews;
import com.blockout.backend.sporting.application.model.SportingViews.ClubView;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionView;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.SportingViews.PackView;
import com.blockout.backend.sporting.application.model.SportingViews.ParticipationView;
import com.blockout.backend.sporting.application.model.SportingViews.PoolClassificationView;
import com.blockout.backend.sporting.application.model.SportingViews.PoolView;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.model.SportingViews.TeamView;
import com.blockout.backend.sporting.application.model.TeamCandidate;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Application-owned identity operations; managed entities never cross this port. */
public interface SportingStore {
  /**
   * Reads eligible pool references in bounded owner pages.
   *
   * @param seasonId canonical seasonal scope
   * @param provider supported source owner
   * @param initialImport permits qualified historical references absent from the current catalog
   * @param organizerReference exact binding context
   * @param now admission instant for reliable fast windows
   * @param page bounded pool page
   * @return qualified calendar/standings references for at most 200 selected pools
   */
  List<AcquisitionReference> acquisitionPools(
      UUID seasonId,
      CollectionProviderEnum provider,
      String organizerReference,
      boolean initialImport,
      Instant now,
      int page);

  /**
   * Reads qualified detail references in bounded owner pages.
   *
   * @param poolId already eligible contextual pool
   * @param now admission instant
   * @param page bounded match page
   * @return current professional detail references
   */
  List<AcquisitionReference> acquisitionDetails(UUID poolId, Instant now, int page);

  /**
   * Reads seasonless identities without personal locality.
   *
   * @param geocoding select current geocoding needs rather than club-sheet references
   * @param manual whether to revisit ordinary no-result localities
   * @param page bounded club page
   * @return stable current club references without personal values
   */
  List<AcquisitionReference> acquisitionClubs(boolean geocoding, boolean manual, int page);

  /**
   * Resolves currently permitted localities in one batch.
   *
   * @param clubIds current organizations from a bounded target page
   * @return permitted localities and their revisions by identity, omitting removed organizations
   */
  Map<UUID, ClubLocalityView> clubLocalities(List<UUID> clubIds);

  /**
   * Reads acquisition lifecycle on the canonical season.
   *
   * @param id canonical season identity
   * @return its current acquisition lifecycle without exposing persistence
   */
  Optional<SportingViews.CollectionSeasonView> collectionSeason(UUID id);

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

  /**
   * Locks the pack's canonical season before reading mutable classification.
   *
   * @param packId established native grouping
   * @throws SportingResourceNotFoundException if no pack exists
   */
  void lockPackSeason(UUID packId);

  /**
   * Reads the current pack default.
   *
   * @param id native grouping
   * @return current setting and editing version, or empty
   */
  Optional<PackView> pack(UUID id);

  /**
   * Reads a pool's published identity and independent acquisition override.
   *
   * @param id contextual pool
   * @return current local editor state, or empty
   */
  Optional<PoolClassificationView> poolClassification(UUID id);

  /**
   * Reads all classification scopes within one pack, under the season transaction.
   *
   * @param packId locked native grouping
   * @return its pools, including explicit overrides
   */
  List<PoolClassificationView> packPools(UUID packId);

  /**
   * Returns distinct teams having a retained participation in the supplied pools.
   *
   * @param poolIds affected correction scopes
   * @return each affected team once, including absent participations
   */
  List<TeamView> teamsInPools(List<UUID> poolIds);

  /**
   * Returns every retained participation for the affected teams.
   *
   * @param teamIds affected stable identities
   * @return relationships with their current published classification
   */
  List<ParticipationView> participations(List<UUID> teamIds);

  /**
   * Replaces a complete pack default and flushes its managed editing revision.
   *
   * @param id locked pack
   * @param setting complete default, or null to remove it
   */
  void setPackClassification(UUID id, SportingClassification setting);

  /**
   * Replaces a complete pool override and flushes its managed editing revision.
   *
   * @param id pool within the locked season
   * @param setting complete override, or null to restore inheritance
   */
  void setPoolClassification(UUID id, SportingClassification setting);

  /**
   * Updates validated published scopes without changing identities or relationships.
   *
   * @param poolIds all validated pool scopes
   * @param teamIds all validated affected teams
   * @param classification complete accepted replacement; never null
   */
  void correctClassification(
      List<UUID> poolIds, List<UUID> teamIds, SportingClassification classification);

  /**
   * Locks a division after season roots and before account roots.
   *
   * @param id existing target division
   * @return activity held stable through caller commit, or empty
   */
  Optional<DivisionView> lockDivision(UUID id);

  /**
   * Reads complete division editing state.
   *
   * @param id configured division
   * @return detached current values, or empty
   */
  Optional<DivisionDetail> divisionDetail(UUID id);

  /**
   * Lists divisions by case-folded name and UUID, optionally including inactive entries.
   *
   * @param includeInactive whether inactive choices are included
   * @return the ordered configuration list
   */
  List<DivisionDetail> divisions(boolean includeInactive);

  /**
   * Creates one active division with its validated optional image in the caller transaction.
   *
   * @param name nonblank unique display name
   * @param color validated primary sRGB color
   * @param gradient three validated colors, or null
   * @param image validated PNG/JPEG bytes, or null
   * @param mediaType actual image type, or null with no image
   * @return committed-to-context identity and initial revision
   * @throws SportingConflictException if the name already exists ignoring case
   */
  DivisionDetail createDivision(
      String name, String color, List<String> gradient, byte[] image, String mediaType);

  /**
   * Changes activity only and flushes the managed revision.
   *
   * @param id division locked by the caller
   * @param active explicit desired activity
   * @return current editor state after the change
   */
  DivisionDetail setDivisionActive(UUID id, boolean active);

  /**
   * Finds FFVB canonical-name or qualified-alias collisions within the affected teams and against
   * existing teams in the proposed classification. The caller holds the season lock.
   *
   * @param teamIds teams in the locked season
   * @param target complete proposed classification
   * @return conflicting existing team identities
   */
  List<UUID> classificationCollisions(List<UUID> teamIds, SportingClassification target);
}
