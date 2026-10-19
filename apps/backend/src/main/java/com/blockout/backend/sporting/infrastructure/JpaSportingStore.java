package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.sporting.application.PoolKey;
import com.blockout.backend.sporting.application.SportingClassification;
import com.blockout.backend.sporting.application.SportingConflictException;
import com.blockout.backend.sporting.application.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.SportingStore;
import com.blockout.backend.sporting.application.SportingViews.ClubView;
import com.blockout.backend.sporting.application.SportingViews.DivisionDetail;
import com.blockout.backend.sporting.application.SportingViews.DivisionView;
import com.blockout.backend.sporting.application.SportingViews.MatchView;
import com.blockout.backend.sporting.application.SportingViews.PackView;
import com.blockout.backend.sporting.application.SportingViews.ParticipationView;
import com.blockout.backend.sporting.application.SportingViews.PoolClassificationView;
import com.blockout.backend.sporting.application.SportingViews.PoolView;
import com.blockout.backend.sporting.application.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.SportingViews.TeamView;
import com.blockout.backend.sporting.application.TeamCandidate;
import com.blockout.backend.sporting.application.UnresolvedSportingIdentityException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Repository;

/** Native JPA identity adapter; caller-owned transactions retain locks through commit. */
@Repository
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
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
        pools.findSeasonId(poolId).orElseThrow(() -> new SportingResourceNotFoundException()));
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
    teams.findById(id).orElseThrow().setSourceName(sourceName);
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

  /** {@inheritDoc} */
  @Override
  public void lockPackSeason(UUID packId) {
    lockSeason(packs.findSeasonId(packId).orElseThrow(SportingResourceNotFoundException::new));
  }

  /** {@inheritDoc} */
  @Override
  public Optional<PackView> pack(UUID id) {
    return packs.findById(id).map(mapper::toView);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<PoolClassificationView> poolClassification(UUID id) {
    return pools.findById(id).map(mapper::toClassificationView);
  }

  /** {@inheritDoc} */
  @Override
  public List<PoolClassificationView> packPools(UUID packId) {
    return pools.findByPackId(packId).stream().map(mapper::toClassificationView).toList();
  }

  /** {@inheritDoc} */
  @Override
  public List<TeamView> teamsInPools(List<UUID> poolIds) {
    return poolIds.isEmpty()
        ? List.of()
        : teams.findParticipatingIn(poolIds).stream().map(mapper::toView).toList();
  }

  /** {@inheritDoc} */
  @Override
  public List<ParticipationView> participations(List<UUID> teamIds) {
    return teamIds.isEmpty()
        ? List.of()
        : participations.findByTeamIdIn(teamIds).stream().map(mapper::toView).toList();
  }

  /** {@inheritDoc} */
  @Override
  public void setPackClassification(UUID id, SportingClassification setting) {
    packs.findById(id).orElseThrow().setSetting(setting(setting));
    packs.flush();
  }

  /** {@inheritDoc} */
  @Override
  public void setPoolClassification(UUID id, SportingClassification setting) {
    pools.findById(id).orElseThrow().setSetting(setting(setting));
    pools.flush();
  }

  /** {@inheritDoc} */
  @Override
  public void correctClassification(
      List<UUID> poolIds, List<UUID> teamIds, SportingClassification classification) {
    DivisionEntity division = divisions.getReferenceById(classification.divisionId());
    for (PoolEntity pool : pools.findAllById(poolIds)) {
      pool.setDivision(division);
      pool.setFormat(classification.format());
      pool.setGender(classification.gender());
    }
    for (TeamEntity team : teams.findAllById(teamIds)) {
      team.setDivision(division);
      team.setFormat(classification.format());
      team.setGender(classification.gender());
    }
  }

  /** {@inheritDoc} */
  @Override
  public Optional<DivisionView> lockDivision(UUID id) {
    return divisions.lockById(id).map(mapper::toView);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<DivisionDetail> divisionDetail(UUID id) {
    return divisions.findById(id).map(this::divisionDetail);
  }

  /** {@inheritDoc} */
  @Override
  public List<DivisionDetail> divisions(boolean includeInactive) {
    return divisions.findConfigured(includeInactive).stream().map(this::divisionDetail).toList();
  }

  /** {@inheritDoc} */
  @Override
  public DivisionDetail createDivision(
      String name, String color, List<String> gradient, byte[] image, String mediaType) {
    try {
      return divisionDetail(
          divisions.saveAndFlush(new DivisionEntity(name, color, gradient, image, mediaType)));
    } catch (DataIntegrityViolationException failure) {
      if (failure.getCause() instanceof ConstraintViolationException constraint
          && "uk_division_name".equals(constraint.getConstraintName())) {
        throw new SportingConflictException("conflict", List.of());
      }
      throw failure;
    }
  }

  /** {@inheritDoc} */
  @Override
  public DivisionDetail setDivisionActive(UUID id, boolean active) {
    DivisionEntity division = divisions.findById(id).orElseThrow();
    division.setActive(active);
    divisions.flush();
    return divisionDetail(division);
  }

  /**
   * Preserves absence as a missing embeddable rather than a sentinel classification.
   *
   * @param classification complete application setting, or null
   * @return the relational setting, or null
   */
  private ClassificationSetting setting(SportingClassification classification) {
    return classification == null
        ? null
        : new ClassificationSetting(
            classification.divisionId(), classification.format(), classification.gender());
  }

  /**
   * Combines relational gradient columns and projects image presence without exposing bytes.
   *
   * @param division current managed owner inside the transaction
   * @return detached editor state
   */
  private DivisionDetail divisionDetail(DivisionEntity division) {
    List<String> gradient =
        division.getGradientStart() == null
            ? null
            : List.of(
                division.getGradientStart(),
                division.getGradientMiddle(),
                division.getGradientEnd());
    return new DivisionDetail(
        division.getId(),
        division.getRevision(),
        division.getName(),
        division.getColor(),
        gradient,
        division.getLogo() != null,
        division.isActive());
  }

  /** {@inheritDoc} */
  @Override
  public List<UUID> classificationCollisions(List<UUID> teamIds, SportingClassification target) {
    return teamIds.isEmpty() ? List.of() : teams.findClassificationCollisions(teamIds, target);
  }
}
