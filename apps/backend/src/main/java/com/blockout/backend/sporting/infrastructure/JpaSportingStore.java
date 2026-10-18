package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.sporting.application.PoolKey;
import com.blockout.backend.sporting.application.SportingClassification;
import com.blockout.backend.sporting.application.SportingStore;
import com.blockout.backend.sporting.application.SportingViews.ClubView;
import com.blockout.backend.sporting.application.SportingViews.DivisionView;
import com.blockout.backend.sporting.application.SportingViews.MatchView;
import com.blockout.backend.sporting.application.SportingViews.PoolView;
import com.blockout.backend.sporting.application.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.SportingViews.TeamView;
import com.blockout.backend.sporting.application.TeamCandidate;
import com.blockout.backend.sporting.application.UnresolvedSportingIdentityException;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

/** Native JPA identity adapter; caller-owned transactions retain locks through commit. */
@Repository
public class JpaSportingStore implements SportingStore {
  private final SeasonRepository seasons;
  private final ClubRepository clubs;
  private final DivisionRepository divisions;
  private final PackRepository packs;
  private final PoolRepository pools;
  private final TeamRepository teams;
  private final ParticipationRepository participations;
  private final MatchRepository matches;
  private final SportingIdentityMapper mapper;

  /**
   * Wires native repositories for the actual retained identity owners.
   *
   * @param seasons canonical season access and row lock
   * @param clubs persistent organizations
   * @param divisions current classification owners
   * @param packs provider groupings
   * @param pools compound pool identities
   * @param teams contextual team identities and verified aliases
   * @param participations retained team/pool relations
   * @param matches scoped encounter identities
   * @param mapper generated entity-to-application conversion
   */
  JpaSportingStore(
      SeasonRepository seasons,
      ClubRepository clubs,
      DivisionRepository divisions,
      PackRepository packs,
      PoolRepository pools,
      TeamRepository teams,
      ParticipationRepository participations,
      MatchRepository matches,
      SportingIdentityMapper mapper) {
    this.seasons = seasons;
    this.clubs = clubs;
    this.divisions = divisions;
    this.packs = packs;
    this.pools = pools;
    this.teams = teams;
    this.participations = participations;
    this.matches = matches;
    this.mapper = mapper;
  }

  /** {@inheritDoc} */
  @Override
  public Optional<SeasonView> seasonByYear(long year) {
    return seasons.findByStartYear(year).map(mapper::toView);
  }

  /** {@inheritDoc} */
  @Override
  public SeasonView createSeason(long year, String label) {
    return mapper.toView(seasons.save(new SeasonEntity(year, label)));
  }

  /** {@inheritDoc} */
  @Override
  public Optional<SeasonView> season(UUID id) {
    return seasons.findById(id).map(mapper::toView);
  }

  /** {@inheritDoc} */
  @Override
  public void lockSeason(UUID id) {
    seasons
        .lockById(id)
        .orElseThrow(() -> new UnresolvedSportingIdentityException("Unknown canonical season"));
  }

  /** {@inheritDoc} */
  @Override
  public void lockPoolSeason(UUID poolId) {
    lockSeason(
        pools
            .findSeasonId(poolId)
            .orElseThrow(() -> new UnresolvedSportingIdentityException("Unknown contextual pool")));
  }

  /** {@inheritDoc} */
  @Override
  public Optional<DivisionView> division(UUID id) {
    return divisions.findById(id).map(mapper::toView);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<PoolView> pool(PoolKey key) {
    return pools.findByKey(key).map(mapper::toView);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<PoolView> pool(UUID id) {
    return pools.findById(id).map(mapper::toView);
  }

  /** {@inheritDoc} */
  @Override
  public PoolView createPool(
      PoolKey key, String packReference, String sourceName, SportingClassification classification) {
    SeasonEntity season = seasons.getReferenceById(key.seasonId());
    PackEntity pack =
        packs
            .findByProviderAndSeasonIdAndOrganizerReferenceAndReference(
                key.provider(), key.seasonId(), key.organizerReference(), packReference)
            .orElseGet(
                () ->
                    packs.save(
                        new PackEntity(
                            season, key.provider(), key.organizerReference(), packReference)));
    return mapper.toView(
        pools.save(
            new PoolEntity(
                season,
                pack,
                key.provider(),
                key.organizerReference(),
                key.competitionReference(),
                key.tourReference(),
                key.groupReference(),
                key.reference(),
                sourceName,
                divisions.getReferenceById(classification.divisionId()),
                classification.format(),
                classification.gender())));
  }

  /** {@inheritDoc} */
  @Override
  public Optional<ClubView> club(CollectionProviderEnum provider, String reference) {
    return clubs.findByProviderAndReference(provider, reference).map(mapper::toView);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<ClubView> club(UUID id) {
    return clubs.findById(id).map(mapper::toView);
  }

  /** {@inheritDoc} */
  @Override
  public ClubView createClub(CollectionProviderEnum provider, String reference, String sourceName) {
    return mapper.toView(clubs.save(new ClubEntity(provider, reference, sourceName)));
  }

  /** {@inheritDoc} */
  @Override
  public Optional<TeamView> ffvbTeam(
      UUID seasonId, UUID clubId, SportingClassification classification, String name) {
    return teams
        .findByProviderAndSeasonIdAndClubIdAndDivisionIdAndFormatAndGenderAndComparisonName(
            CollectionProviderEnum.FFVB,
            seasonId,
            clubId,
            classification.divisionId(),
            classification.format(),
            classification.gender(),
            name)
        .map(mapper::toView);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<TeamView> teamAlias(PoolView pool, UUID clubId, String name) {
    return teams.findByVerifiedAlias(pool, clubId, name).map(mapper::toView);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<TeamView> lnvTeam(PoolView pool, String reference) {
    return teams
        .findByProviderAndSeasonIdAndOrganizerReferenceAndCompetitionReferenceAndNativeReference(
            CollectionProviderEnum.LNV,
            pool.key().seasonId(),
            pool.key().organizerReference(),
            pool.key().competitionReference(),
            reference)
        .map(mapper::toView);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<TeamView> team(UUID id) {
    return teams.findById(id).map(mapper::toView);
  }

  /** {@inheritDoc} */
  @Override
  public TeamView createTeam(
      PoolView pool, UUID clubId, TeamCandidate candidate, String comparisonName) {
    SportingClassification classification = pool.classification();
    return mapper.toView(
        teams.save(
            new TeamEntity(
                seasons.getReferenceById(pool.key().seasonId()),
                pool.key().provider(),
                pool.key().organizerReference(),
                pool.key().competitionReference(),
                candidate.nativeReference(),
                candidate.sourceName(),
                comparisonName,
                clubId == null ? null : clubs.getReferenceById(clubId),
                divisions.getReferenceById(classification.divisionId()),
                classification.format(),
                classification.gender())));
  }

  /** {@inheritDoc} */
  @Override
  public void updateTeamSourceName(UUID id, String sourceName) {
    teams.findById(id).orElseThrow().updateSourceName(sourceName);
  }

  /** {@inheritDoc} */
  @Override
  public void participate(UUID teamId, UUID poolId) {
    if (!participations.existsByTeamIdAndPoolId(teamId, poolId))
      participations.save(
          new ParticipationEntity(
              teams.getReferenceById(teamId), pools.getReferenceById(poolId), true));
  }

  /** {@inheritDoc} */
  @Override
  public Optional<MatchView> match(UUID poolId, String reference) {
    return matches.findByPoolIdAndReference(poolId, reference).map(mapper::toView);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<MatchView> match(UUID id) {
    return matches.findById(id).map(mapper::toView);
  }

  /** {@inheritDoc} */
  @Override
  public MatchView createMatch(UUID poolId, String reference, UUID homeTeamId, UUID awayTeamId) {
    return mapper.toView(
        matches.save(
            new MatchEntity(
                pools.getReferenceById(poolId),
                reference,
                teams.getReferenceById(homeTeamId),
                teams.getReferenceById(awayTeamId))));
  }
}
