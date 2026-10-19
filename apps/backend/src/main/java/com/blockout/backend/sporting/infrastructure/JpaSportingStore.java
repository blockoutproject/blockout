package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.sporting.application.AcquisitionReference;
import com.blockout.backend.sporting.application.ClubLocalityView;
import com.blockout.backend.sporting.application.PoolKey;
import com.blockout.backend.sporting.application.SportingClassification;
import com.blockout.backend.sporting.application.SportingConflictException;
import com.blockout.backend.sporting.application.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.SportingStore;
import com.blockout.backend.sporting.application.SportingViews;
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
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
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
  public List<AcquisitionReference> acquisitionPools(
      UUID seasonId,
      CollectionProviderEnum provider,
      String organizerReference,
      boolean initialImport,
      Instant now,
      int page) {
    List<PoolEntity> selected =
        pools.acquisitionPools(
            seasonId, provider, organizerReference, initialImport, PageRequest.of(page, 200));
    if (selected.isEmpty()) return List.of();
    Map<UUID, Instant> windows =
        matches
            .fastStarts(
                selected.stream().map(PoolEntity::getId).toList(),
                now.minus(Duration.ofHours(4)),
                now.plus(Duration.ofHours(1)))
            .stream()
            .collect(
                Collectors.toMap(
                    MatchRepository.FastStart::poolId,
                    value -> value.start().plus(Duration.ofHours(4))));
    List<AcquisitionReference> references = new ArrayList<>();
    for (PoolEntity pool : selected) {
      if (pool.getCalendarUrl() != null)
        references.add(
            acquisitionReference(
                pool,
                CollectionTargetKindEnum.CALENDAR,
                pool.getId(),
                null,
                null,
                pool.getCalendarUrl(),
                windows.get(pool.getId())));
      if (pool.getStandingsUrl() != null)
        references.add(
            acquisitionReference(
                pool,
                CollectionTargetKindEnum.STANDINGS,
                pool.getId(),
                null,
                null,
                pool.getStandingsUrl(),
                windows.get(pool.getId())));
    }
    return references;
  }

  /** {@inheritDoc} */
  @Override
  public List<AcquisitionReference> acquisitionDetails(UUID poolId, Instant now, int page) {
    return matches.acquisitionDetails(poolId, PageRequest.of(page, 200)).stream()
        .map(
            match -> {
              Instant start = match.getReliableStart();
              Instant end =
                  start == null
                          || now.isBefore(start.minus(Duration.ofHours(1)))
                          || now.isAfter(start.plus(Duration.ofHours(4)))
                      ? null
                      : start.plus(Duration.ofHours(4));
              return acquisitionReference(
                  match.getPool(),
                  CollectionTargetKindEnum.DETAILS,
                  match.getId(),
                  match.getId(),
                  match.getReference(),
                  match.getDetailUrl(),
                  end);
            })
        .toList();
  }

  /** {@inheritDoc} */
  @Override
  public List<AcquisitionReference> acquisitionClubs(boolean geocoding, boolean manual, int page) {
    return clubs.acquisitionClubs(geocoding, manual, PageRequest.of(page, 200)).stream()
        .map(
            club ->
                new AcquisitionReference(
                    club.getId(),
                    geocoding
                        ? CollectionTargetKindEnum.GEOCODING
                        : CollectionTargetKindEnum.CLUB_SHEET,
                    null,
                    null,
                    null,
                    null,
                    club.getId(),
                    club.getReference(),
                    null,
                    null,
                    null,
                    club.getProvider(),
                    null))
        .toList();
  }

  /** {@inheritDoc} */
  @Override
  public Map<UUID, ClubLocalityView> clubLocalities(List<UUID> clubIds) {
    return clubs.findAllById(clubIds).stream()
        .collect(
            Collectors.toMap(
                ClubEntity::getId,
                club ->
                    new ClubLocalityView(
                        Long.toString(club.getLocalityRevision()),
                        club.isMunicipalityRestricted() ? null : club.getMunicipality(),
                        club.isMunicipalityRestricted() ? null : club.getPostalCode())));
  }

  /**
   * Combines a qualified native reference with effective acquisition settings, never published
   * fallbacks.
   *
   * @param pool eligible contextual owner
   * @param kind read purpose
   * @param scopeId stable pool or match identity
   * @param matchId detail identity, otherwise absent
   * @param reference native detail reference, otherwise absent
   * @param url current qualified read URL
   * @param windowEnd current reliable fast window end, otherwise absent
   * @return detached nonpersonal acquisition context
   */
  private AcquisitionReference acquisitionReference(
      PoolEntity pool,
      CollectionTargetKindEnum kind,
      UUID scopeId,
      UUID matchId,
      String reference,
      String url,
      Instant windowEnd) {
    ClassificationSetting setting =
        pool.getSetting() == null ? pool.getPack().getSetting() : pool.getSetting();
    return new AcquisitionReference(
        scopeId,
        kind,
        mapper.toKey(pool),
        pool.getPack().getReference(),
        pool.getId(),
        matchId,
        null,
        null,
        mapper.toClassification(setting),
        url,
        windowEnd,
        pool.getProvider(),
        reference);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<SportingViews.CollectionSeasonView> collectionSeason(UUID id) {
    return seasons.findById(id).map(mapper::toCollectionView);
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
    packs.findById(id).orElseThrow().setSetting(mapper.toSetting(setting));
    packs.flush();
  }

  /** {@inheritDoc} */
  @Override
  public void setPoolClassification(UUID id, SportingClassification setting) {
    pools.findById(id).orElseThrow().setSetting(mapper.toSetting(setting));
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
    return divisions.findById(id).map(mapper::toDetail);
  }

  /** {@inheritDoc} */
  @Override
  public List<DivisionDetail> divisions(boolean includeInactive) {
    return divisions.findConfigured(includeInactive).stream().map(mapper::toDetail).toList();
  }

  /** {@inheritDoc} */
  @Override
  public DivisionDetail createDivision(
      String name, String color, List<String> gradient, byte[] image, String mediaType) {
    try {
      return mapper.toDetail(
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
    return mapper.toDetail(division);
  }

  /** {@inheritDoc} */
  @Override
  public List<UUID> classificationCollisions(List<UUID> teamIds, SportingClassification target) {
    return teamIds.isEmpty() ? List.of() : teams.findClassificationCollisions(teamIds, target);
  }
}
