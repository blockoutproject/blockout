package com.blockout.backend.sporting.application.service;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.sporting.application.model.AcquisitionReference;
import com.blockout.backend.sporting.application.model.ClubAcquisitionReference;
import com.blockout.backend.sporting.application.model.ClubLocalityView;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionResourcePage;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.SportingViews.PoolView;
import com.blockout.backend.sporting.application.model.SportingViews.TeamView;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Current retained sporting inputs for collection, including hidden identities and permitted
 * localities.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ReadSportingAcquisition {
  private final SportingStore store;

  /**
   * Resolves an encounter's retained pool for acquisition scope checks.
   *
   * @param id stable encounter
   * @return owning pool identity, or empty when the encounter is unknown
   */
  public Optional<UUID> matchPoolId(UUID id) {
    return store.matchPoolId(id);
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
   * Reads a retained seasonal team for internal acquisition, including hidden identities.
   *
   * @param id seasonal team
   * @return current identity/classification
   */
  public Optional<TeamView> team(UUID id) {
    return store.team(id);
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
   * Resolves currently permitted organization localities in one batch.
   *
   * @param clubIds current organizations from a bounded target page
   * @return permitted context by identity, omitting removed organizations
   */
  public Map<UUID, ClubLocalityView> clubLocalities(List<UUID> clubIds) {
    return store.clubLocalities(clubIds);
  }

  /**
   * Reads seasonless acquisition identities without personal locality.
   *
   * @param geocoding selects unresolved municipal candidates rather than club sheets
   * @param afterId exclusive last visited club identity, or null for the first batch
   * @return nonpersonal identities and normal-result metadata; permitted locality is read at target
   *     service
   */
  public List<ClubAcquisitionReference> acquisitionClubs(boolean geocoding, UUID afterId) {
    return store.acquisitionClubs(geocoding, afterId);
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
   * Resolves a known team's retained pool memberships for acquisition scope checks.
   *
   * @param teamId stable sporting team
   * @return owning pool identities without exporting persistence entities
   */
  public List<UUID> teamPools(UUID teamId) {
    return store.teamPoolIds(teamId);
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
   * Counts current catalog pools still lacking an effective acquisition setting. Published
   * classifications, inactive divisions and deliberate pauses do not redefine this need.
   *
   * @param seasonId canonical accepted catalog season
   * @param provider designated catalog provider
   * @return number of unclassified current pools, without materializing their identities
   */
  public long countUnclassifiedPools(UUID seasonId, CollectionProviderEnum provider) {
    return store.countUnclassifiedPools(seasonId, provider);
  }
}
