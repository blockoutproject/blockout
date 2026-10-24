package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.generated.ingestion.model.StandingsPublicationStateEnum;
import com.blockout.backend.sporting.application.SportingProjectionChanges;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Kind;
import com.blockout.backend.sporting.application.exception.SportingConflictException;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.exception.UnresolvedSportingIdentityException;
import com.blockout.backend.sporting.application.model.AcquisitionReference;
import com.blockout.backend.sporting.application.model.CalendarState;
import com.blockout.backend.sporting.application.model.CatalogObservation;
import com.blockout.backend.sporting.application.model.ClubLocalityView;
import com.blockout.backend.sporting.application.model.MatchDetails;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.MatchSchedule;
import com.blockout.backend.sporting.application.model.ObservationOrder;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingPresentation;
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
import com.blockout.backend.sporting.application.model.StandingsView;
import com.blockout.backend.sporting.application.model.TeamCandidate;
import com.blockout.backend.sporting.application.port.SportingStore;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Repository;

/**
 * Native JPA sporting persistence adapter; caller-owned transactions retain locks through commit.
 */
@Repository
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
public class JpaSportingStore implements SportingStore {
  private final EntityManager entityManager;
  private final CatalogRepository catalogs;
  private final StandingsRepository standings;
  private final SeasonRepository seasons;
  private final ClubRepository clubs;
  private final DivisionRepository divisions;
  private final PackRepository packs;
  private final PoolRepository pools;
  private final TeamRepository teams;
  private final ParticipationRepository participations;
  private final MatchRepository matches;
  private final SportingIdentityMapper mapper;
  private final SportingProjectionChanges changes;

  /** {@inheritDoc} */
  @Override
  public SportingViews.CollectionResourcePage collectionChildren(
      UUID seasonId,
      CollectionProviderEnum provider,
      String organizerReference,
      UUID parentId,
      int page,
      int size) {
    PageRequest request = PageRequest.of(page, size);
    if (parentId == null) {
      Slice<PackEntity> slice =
          packs.findBySeasonIdAndProviderAndOrganizerReferenceOrderByReferenceAscIdAsc(
              seasonId, provider, organizerReference, request);
      return new SportingViews.CollectionResourcePage(
          slice.stream().map(mapper::toCollectionResource).toList(), page, slice.hasNext());
    }
    PackEntity pack = packs.findById(parentId).orElseThrow(SportingResourceNotFoundException::new);
    if (!seasonId.equals(pack.getSeason().getId())
        || pack.getProvider() != provider
        || !organizerReference.equals(pack.getOrganizerReference()))
      throw new SportingResourceNotFoundException();
    Slice<PoolEntity> slice = pools.findByPackIdOrderBySourceNameAscIdAsc(parentId, request);
    return new SportingViews.CollectionResourcePage(
        slice.stream().map(mapper::toCollectionResource).toList(), page, slice.hasNext());
  }

  /** {@inheritDoc} */
  @Override
  public List<AcquisitionReference> acquisitionPools(
      UUID seasonId,
      CollectionProviderEnum provider,
      String organizerReference,
      boolean initialImport,
      Instant now,
      UUID afterId) {
    List<PoolEntity> selected =
        pools.acquisitionPools(
            seasonId, provider, organizerReference, initialImport, afterId, PageRequest.of(0, 200));
    if (selected.isEmpty()) return List.of();
    Map<UUID, Instant> windows =
        matches
            .findLatestMatchStartsInWindow(
                selected.stream().map(PoolEntity::getId).toList(),
                now.minus(Duration.ofHours(4)),
                now.plus(Duration.ofHours(1)))
            .stream()
            .collect(
                Collectors.toMap(
                    PoolMatchStart::getPoolId,
                    value -> value.getLatestStart().plus(Duration.ofHours(4))));
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
  public List<AcquisitionReference> acquisitionClubs(
      boolean geocoding, boolean manual, UUID afterId) {
    return clubs.acquisitionClubs(geocoding, manual, afterId, PageRequest.of(0, 200)).stream()
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
                        club.getCity().toValue().effectiveValue(),
                        club.getCity().toValue().effectiveValue() == null
                            ? null
                            : club.getPostalCode().toValue().effectiveValue())));
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
  public List<SportingViews.CollectionSeasonView> collectionSeasons() {
    return seasons.findAllByOrderByStartYearDescIdAsc().stream()
        .map(mapper::toCollectionView)
        .toList();
  }

  /** {@inheritDoc} */
  @Override
  public Map<UUID, SportingViews.CollectionSeasonView> collectionSeasons(Set<UUID> ids) {
    if (ids.isEmpty()) return Map.of();
    return seasons.findAllById(ids).stream()
        .collect(Collectors.toUnmodifiableMap(SeasonEntity::getId, mapper::toCollectionView));
  }

  /** {@inheritDoc} */
  @Override
  public SportingViews.CollectionSeasonView updatePreparation(UUID id, boolean activate) {
    SeasonEntity season = seasons.findById(id).orElseThrow(SportingResourceNotFoundException::new);
    long revision = season.getCollectionRevision();
    if (activate) season.setCollectionState(CollectionSeasonStateEnum.ACTIVE);
    seasons.flush();
    if (season.getCollectionRevision() == revision)
      entityManager.lock(season, LockModeType.PESSIMISTIC_FORCE_INCREMENT);
    return mapper.toCollectionView(season);
  }

  /** {@inheritDoc} */
  @Override
  public SportingViews.CollectionSeasonView closeCollectionSeason(UUID id) {
    SeasonEntity season = seasons.findById(id).orElseThrow(SportingResourceNotFoundException::new);
    season.setCollectionState(CollectionSeasonStateEnum.CLOSED);
    seasons.flush();
    return mapper.toCollectionView(season);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<SeasonView> seasonByYear(long year) {
    return seasons.findByStartYear(year);
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
                classification == null
                    ? null
                    : divisions.getReferenceById(classification.divisionId()),
                classification == null ? null : classification.format(),
                classification == null ? null : classification.gender())));
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
    ClubView club = mapper.toView(clubs.save(new ClubEntity(provider, reference, sourceName)));
    changes.submit(Kind.CLUB, club.id());
    return club;
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
    TeamEntity team = teams.findById(id).orElseThrow();
    if (!Objects.equals(team.getSourceName(), sourceName)) {
      team.setSourceName(sourceName);
      team.setPresentationRevision(team.getPresentationRevision() + 1);
      changes.submit(Kind.TEAM, id);
    }
  }

  /** {@inheritDoc} */
  @Override
  public void participate(UUID teamId, UUID poolId) {
    ParticipationEntity existing =
        participations.findByTeamIdAndPoolId(teamId, poolId).orElse(null);
    if (existing == null) {
      participations.save(
          new ParticipationEntity(
              teams.getReferenceById(teamId), pools.getReferenceById(poolId), true));
      changes.submit(Kind.POOL, poolId);
    } else if (!existing.isCurrent()) {
      existing.setCurrent(true);
      changes.submit(Kind.POOL, poolId);
    }
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
  public Optional<UUID> matchPoolId(UUID id) {
    return matches.findPoolId(id);
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
  public List<UUID> teamPoolIds(UUID teamId) {
    return participations.findPoolIdsByTeamId(teamId);
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
      changes.submit(Kind.POOL, pool.getId());
    }
    for (TeamEntity team : teams.findAllById(teamIds)) {
      team.setDivision(division);
      team.setFormat(classification.format());
      team.setGender(classification.gender());
      changes.submit(Kind.TEAM, team.getId());
    }
  }

  /** {@inheritDoc} */
  @Override
  public Optional<DivisionDetail> lockDivision(UUID id) {
    return divisions.lockById(id).map(mapper::toDetail);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<DivisionDetail> divisionDetail(UUID id) {
    return divisions.findSummaryById(id).map(mapper::toDetail);
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
    changes.submit(Kind.DIVISION, id);
    divisions.flush();
    return mapper.toDetail(division);
  }

  /** {@inheritDoc} */
  @Override
  public List<UUID> classificationCollisions(List<UUID> teamIds, SportingClassification target) {
    return teamIds.isEmpty() ? List.of() : teams.findClassificationCollisions(teamIds, target);
  }

  /** {@inheritDoc} */
  @Override
  public CalendarState calendarState(UUID poolId) {
    PoolEntity pool = pools.findById(poolId).orElseThrow();
    return new CalendarState(
        order(pool.getCalendarCycleOrder(), pool.getCalendarReadOrdinal()),
        order(pool.getCompletedCycleOrder(), pool.getCompletedReadOrdinal()));
  }

  /** {@inheritDoc} */
  @Override
  public void beginCalendar(UUID poolId, ObservationOrder order) {
    PoolEntity pool = pools.findById(poolId).orElseThrow();
    pool.setCalendarCycleOrder(order.cycleOrder());
    pool.setCalendarReadOrdinal(order.readOrdinal());
  }

  /** {@inheritDoc} */
  @Override
  public void completeCalendar(
      UUID poolId, ObservationOrder order, Set<String> presentReferences, boolean empty) {
    PoolEntity pool = pools.findById(poolId).orElseThrow();
    boolean changed = pool.isCalendarEmpty() != empty;
    pool.setCalendarEmpty(empty);
    Set<UUID> presentTeams = new HashSet<>();
    for (MatchEntity match : matches.findByPoolId(poolId)) {
      boolean present = presentReferences.contains(match.getReference());
      changed |= match.isPresent() != present;
      match.setPresent(present);
      if (present) {
        presentTeams.add(match.getHomeTeam().getId());
        presentTeams.add(match.getAwayTeam().getId());
      }
    }
    for (ParticipationEntity participation : participations.findByPoolId(poolId)) {
      boolean present = presentTeams.contains(participation.getTeam().getId());
      changed |= participation.isCurrent() != present;
      participation.setCurrent(present);
    }
    pool.setCompletedCycleOrder(order.cycleOrder());
    pool.setCompletedReadOrdinal(order.readOrdinal());
    if (changed) changes.submit(Kind.POOL, poolId);
  }

  /** {@inheritDoc} */
  @Override
  public boolean restoreCalendarPresence(UUID matchId) {
    MatchEntity match = matches.findById(matchId).orElseThrow();
    PoolEntity pool = match.getPool();
    boolean changed = !match.isPresent() || pool.isCalendarEmpty();
    match.setPresent(true);
    pool.setCalendarEmpty(false);
    if (changed) changes.submit(Kind.POOL, pool.getId());
    return changed;
  }

  /** {@inheritDoc} */
  @Override
  public ObservationOrder matchOrder(UUID poolId, String reference) {
    return matches
        .findByPoolIdAndReference(poolId, reference)
        .map(match -> order(match.getAcceptedCycleOrder(), match.getAcceptedReadOrdinal()))
        .orElse(null);
  }

  /** {@inheritDoc} */
  @Override
  public MatchSchedule lockMatchSchedule(UUID matchId) {
    return mapper.toSchedule(
        matches.lockById(matchId).orElseThrow(SportingResourceNotFoundException::new));
  }

  /** {@inheritDoc} */
  @Override
  public void saveMatchSchedule(MatchSchedule schedule) {
    mapper.updateSchedule(schedule, matches.findById(schedule.id()).orElseThrow());
  }

  /** {@inheritDoc} */
  @Override
  public ObservationOrder catalogOrder(UUID sourceId) {
    return catalogs
        .findById(sourceId)
        .map(value -> new ObservationOrder(value.getCycleOrder(), value.getReadOrdinal()))
        .orElse(null);
  }

  /** {@inheritDoc} */
  @Override
  public UUID acceptCatalogPool(PoolKey key, CatalogObservation.Pool candidate) {
    PoolEntity pool = pools.findByKey(key).orElse(null);
    if (pool == null) {
      UUID id = createPool(key, candidate.packReference(), candidate.sourceName(), null).id();
      pool = pools.findById(id).orElseThrow();
    }
    if (!pool.getPack().getReference().equals(candidate.packReference()))
      throw new SportingConflictException("identity-conflict", List.of());
    boolean changed =
        !pool.isCatalogEligible() || !Objects.equals(pool.getSourceName(), candidate.sourceName());
    if (!Objects.equals(pool.getSourceName(), candidate.sourceName()))
      pool.setPresentationRevision(pool.getPresentationRevision() + 1);
    pool.setSourceName(candidate.sourceName());
    pool.setCatalogEligible(true);
    if (changed) changes.submit(Kind.POOL, pool.getId());
    if (candidate.calendarUrl() != null) pool.setCalendarUrl(candidate.calendarUrl().toString());
    if (candidate.standingsUrl() != null) pool.setStandingsUrl(candidate.standingsUrl().toString());
    return pool.getId();
  }

  /** {@inheritDoc} */
  @Override
  public void finishCatalog(
      UUID sourceId,
      UUID seasonId,
      CollectionProviderEnum provider,
      String organizer,
      Set<UUID> presentIds,
      boolean complete,
      ObservationOrder order,
      MatchObservation.Context context) {
    if (complete)
      for (PoolEntity pool :
          pools.findBySeasonIdAndProviderAndOrganizerReference(seasonId, provider, organizer))
        if (!presentIds.contains(pool.getId()) && pool.isCatalogEligible()) {
          pool.setCatalogEligible(false);
          changes.submit(Kind.POOL, pool.getId());
        }
    CatalogEntity catalog = catalogs.findById(sourceId).orElse(null);
    boolean created = catalog == null;
    if (created) catalog = new CatalogEntity(sourceId);
    catalog.setCycleOrder(order.cycleOrder());
    catalog.setReadOrdinal(order.readOrdinal());
    catalog.setObservedAt(context.observedAt().toInstant());
    catalog.setProviderPublishedAt(
        context.providerPublishedAt() == null ? null : context.providerPublishedAt().toInstant());
    if (created) catalogs.save(catalog);
  }

  /**
   * Preserves absence before first acceptance without a sentinel order.
   *
   * @param cycle backend cycle order, null before acceptance
   * @param ordinal pre-read ordinal paired with that cycle
   * @return logical token, or null before acceptance
   */
  private ObservationOrder order(Long cycle, Long ordinal) {
    return cycle == null ? null : new ObservationOrder(cycle, ordinal);
  }

  /** {@inheritDoc} */
  @Override
  public MatchDetails matchDetails(UUID matchId) {
    return mapper.toDetails(matches.findById(matchId).orElseThrow());
  }

  /** {@inheritDoc} */
  @Override
  public void saveMatchDetails(MatchDetails details) {
    mapper.updateDetails(details, matches.findById(details.id()).orElseThrow());
  }

  /** {@inheritDoc} */
  @Override
  public Optional<StandingsView> standings(UUID poolId) {
    return standings.findById(poolId).map(mapper::toView);
  }

  /** {@inheritDoc} */
  @Override
  public void saveStandings(StandingsView value) {
    StandingsEntity entity = standings.findById(value.poolId()).orElse(null);
    boolean created = entity == null;
    if (created) entity = new StandingsEntity(value.poolId());
    mapper.updateStandings(value, entity);
    if (value.publicationState() == StandingsPublicationStateEnum.PUBLISHED) {
      if (!entity.getColumns().equals(value.columns())) {
        entity.getColumns().clear();
        entity.getColumns().addAll(value.columns());
      }
      if (!mapper.toRowViews(entity.getRows()).equals(value.rows())) {
        entity.getRows().clear();
        entity.getRows().addAll(mapper.toRows(value.rows()));
      }
    }
    if (created) standings.save(entity);
  }

  /** {@inheritDoc} */
  @Override
  public List<TeamView> currentPoolTeams(UUID poolId) {
    return teams.findCurrentIn(poolId).stream().map(mapper::toView).toList();
  }

  /** {@inheritDoc} */
  @Override
  public void lockPresentation(Kind kind, UUID id) {
    switch (kind) {
      case CLUB -> clubs.lockById(id).orElseThrow(SportingResourceNotFoundException::new);
      case POOL -> lockPoolSeason(id);
      case TEAM -> {
        UUID season =
            entityManager
                .createQuery("SELECT t.season.id FROM TeamEntity t WHERE t.id = :id", UUID.class)
                .setParameter("id", id)
                .getSingleResultOrNull();
        if (season == null) throw new SportingResourceNotFoundException();
        lockSeason(season);
        TeamEntity team = teams.findById(id).orElseThrow();
        if (team.getClub() != null) clubs.lockById(team.getClub().getId()).orElseThrow();
      }
      default -> throw new IllegalArgumentException("Unsupported presentation kind");
    }
  }

  /** {@inheritDoc} */
  @Override
  public Optional<SportingPresentation.View> presentation(Kind kind, UUID id) {
    return switch (kind) {
      case CLUB ->
          clubs
              .findById(id)
              .map(
                  club -> {
                    String manual = club.getLogo() == null ? null : "/clubs/" + id + "/logo";
                    return new SportingPresentation.View(
                        id,
                        kind,
                        Long.toString(club.getPresentationRevision()),
                        names(club.getSourceName(), club.getManualName(), null, false),
                        new SportingPresentation.Logo(manual, manual, null));
                  });
      case TEAM ->
          teams
              .findById(id)
              .map(
                  team -> {
                    ClubEntity club = team.getClub();
                    String manual = team.getLogo() == null ? null : "/teams/" + id + "/logo";
                    String automatic =
                        team.getProvider() == CollectionProviderEnum.LNV
                                && team.getSourceLogo() != null
                            ? "/teams/" + id + "/logo"
                            : club != null && club.getLogo() != null
                                ? "/clubs/" + club.getId() + "/logo"
                                : null;
                    String revision =
                        team.getPresentationRevision()
                            + "."
                            + (club == null ? 0 : club.getLogoRevision());
                    return new SportingPresentation.View(
                        id,
                        kind,
                        revision,
                        names(
                            team.getSourceName(),
                            team.getManualName(),
                            team.getManualShortName(),
                            true),
                        new SportingPresentation.Logo(
                            manual == null ? automatic : manual, manual, automatic));
                  });
      case POOL ->
          pools
              .findById(id)
              .map(
                  pool ->
                      new SportingPresentation.View(
                          id,
                          kind,
                          Long.toString(pool.getPresentationRevision()),
                          names(
                              pool.getSourceName(),
                              pool.getManualName(),
                              pool.getManualShortName(),
                              true),
                          null));
      default -> throw new IllegalArgumentException("Unsupported presentation kind");
    };
  }

  /**
   * Resolves independent manual names without altering the original identity/comparison labels.
   *
   * @param source current attributable name, possibly unknown for a club
   * @param manual independent full-name override
   * @param shortName independent short override
   * @param hasShortName whether this owner exposes a short name
   * @return detached current names
   */
  private SportingPresentation.Names names(
      String source, String manual, String shortName, boolean hasShortName) {
    return new SportingPresentation.Names(
        source,
        manual == null ? source == null ? "" : source : manual,
        manual,
        hasShortName ? shortName == null ? source : shortName : null,
        shortName);
  }

  /** {@inheritDoc} */
  @Override
  public SportingPresentation.View savePresentation(
      Kind kind, UUID id, SportingPresentation.Edit edit) {
    SportingPresentation.View before =
        presentation(kind, id).orElseThrow(SportingResourceNotFoundException::new);
    boolean nameChanged =
        !Objects.equals(before.names().manualName(), edit.manualName())
            || !Objects.equals(before.names().manualShortName(), edit.manualShortName());
    switch (kind) {
      case CLUB -> {
        ClubEntity club = clubs.findById(id).orElseThrow();
        SportingPresentation.Image next =
            manualImage(edit, image(club.getLogo(), club.getLogoMediaType()));
        boolean logoChanged = !sameImage(next, image(club.getLogo(), club.getLogoMediaType()));
        if (nameChanged || logoChanged) {
          club.setManualName(edit.manualName());
          club.setLogo(next == null ? null : next.bytes());
          club.setLogoMediaType(next == null ? null : next.mediaType());
          club.setLogoSize(next == null ? null : next.bytes().length);
          club.setPresentationRevision(club.getPresentationRevision() + 1);
          if (logoChanged) club.setLogoRevision(club.getLogoRevision() + 1);
          changes.submit(kind, id);
        }
      }
      case TEAM -> {
        TeamEntity team = teams.findById(id).orElseThrow();
        SportingPresentation.Image next =
            manualImage(edit, image(team.getLogo(), team.getLogoMediaType()));
        boolean logoChanged = !sameImage(next, image(team.getLogo(), team.getLogoMediaType()));
        if (nameChanged || logoChanged) {
          team.setManualName(edit.manualName());
          team.setManualShortName(edit.manualShortName());
          team.setLogo(next == null ? null : next.bytes());
          team.setLogoMediaType(next == null ? null : next.mediaType());
          team.setLogoSize(next == null ? null : next.bytes().length);
          team.setPresentationRevision(team.getPresentationRevision() + 1);
          changes.submit(kind, id);
        }
      }
      case POOL -> {
        if (nameChanged) {
          PoolEntity pool = pools.findById(id).orElseThrow();
          pool.setManualName(edit.manualName());
          pool.setManualShortName(edit.manualShortName());
          pool.setPresentationRevision(pool.getPresentationRevision() + 1);
          changes.submit(kind, id);
        }
      }
      default -> throw new IllegalArgumentException("Unsupported presentation kind");
    }
    return presentation(kind, id).orElseThrow();
  }

  /**
   * Applies the complete manual-image instruction to already validated content.
   *
   * @param edit validated atomic editor change
   * @param previous current manual content, possibly absent
   * @return current desired manual content; automatic never copies a fallback image
   */
  private SportingPresentation.Image manualImage(
      SportingPresentation.Edit edit, SportingPresentation.Image previous) {
    return switch (edit.logoAction()) {
      case KEEP -> previous;
      case AUTOMATIC -> null;
      case REPLACE -> edit.image();
    };
  }

  /**
   * Detaches stored bytes only when an association exists.
   *
   * @param bytes current bytes, or null
   * @param type stored actual content type
   * @return immutable original content, or null
   */
  private SportingPresentation.Image image(byte[] bytes, String type) {
    return bytes == null ? null : new SportingPresentation.Image(bytes, type);
  }

  /**
   * Recognizes absent or byte-identical replacements without a new editing revision.
   *
   * @param first candidate current image
   * @param second previous current image
   * @return whether both associations designate the same accepted content
   */
  private boolean sameImage(SportingPresentation.Image first, SportingPresentation.Image second) {
    return first == null ? second == null : first.sameContent(second);
  }

  /** {@inheritDoc} */
  @Override
  public DivisionDetail saveDivisionPresentation(UUID id, SportingPresentation.DivisionEdit edit) {
    DivisionEntity division = divisions.findById(id).orElseThrow();
    SportingPresentation.Image next =
        manualImage(
            new SportingPresentation.Edit(
                edit.revision(), null, null, edit.logoAction(), edit.image()),
            image(division.getLogo(), division.getLogoMediaType()));
    boolean changed =
        !Objects.equals(division.getName(), edit.name())
            || !Objects.equals(division.getColor(), edit.color())
            || !Objects.equals(
                mapper.toGradient(
                    division.getGradientStart(),
                    division.getGradientMiddle(),
                    division.getGradientEnd()),
                edit.gradient())
            || !sameImage(next, image(division.getLogo(), division.getLogoMediaType()));
    if (changed) {
      division.setName(edit.name());
      division.setColor(edit.color());
      division.setGradientStart(edit.gradient() == null ? null : edit.gradient().get(0));
      division.setGradientMiddle(edit.gradient() == null ? null : edit.gradient().get(1));
      division.setGradientEnd(edit.gradient() == null ? null : edit.gradient().get(2));
      division.setLogo(next == null ? null : next.bytes());
      division.setLogoMediaType(next == null ? null : next.mediaType());
      division.setLogoSize(next == null ? null : next.bytes().length);
      changes.submit(Kind.DIVISION, id);
      try {
        divisions.flush();
      } catch (DataIntegrityViolationException failure) {
        if (failure.getCause() instanceof ConstraintViolationException constraint
            && "uk_division_name".equals(constraint.getConstraintName()))
          throw new SportingConflictException("conflict", List.of());
        throw failure;
      }
    }
    return mapper.toDetail(division);
  }

  /** {@inheritDoc} */
  @Override
  public SportingPresentation.Contacts clubContacts(UUID id) {
    ClubEntity club = clubs.findById(id).orElseThrow(SportingResourceNotFoundException::new);
    return new SportingPresentation.Contacts(
        id,
        club.getContactsRevision(),
        club.contactValues(),
        club.getDetailCycleOrder() == null
            ? null
            : new ObservationOrder(club.getDetailCycleOrder(), club.getDetailReadOrdinal()),
        club.getDetailObservedAt(),
        club.getDetailPublishedAt());
  }

  /** {@inheritDoc} */
  @Override
  public void saveClubContacts(SportingPresentation.Contacts contacts, String sourceName) {
    ClubEntity club = clubs.findById(contacts.clubId()).orElseThrow();
    Map<SportingPresentation.ContactField, SportingPresentation.ContactValue> before =
        club.contactValues();
    boolean contactChanged = !before.equals(contacts.fields());
    String cityBefore = before.get(SportingPresentation.ContactField.CITY).effectiveValue();
    String postalBefore =
        before.get(SportingPresentation.ContactField.POSTAL_CODE).effectiveValue();
    club.replaceContacts(contacts.fields());
    boolean nameChanged = sourceName != null && !Objects.equals(sourceName, club.getSourceName());
    if (nameChanged) {
      club.setSourceName(sourceName);
      club.setPresentationRevision(club.getPresentationRevision() + 1);
    }
    if (contactChanged) club.setContactsRevision(club.getContactsRevision() + 1);
    if (!Objects.equals(
            cityBefore,
            contacts.fields().get(SportingPresentation.ContactField.CITY).effectiveValue())
        || !Objects.equals(
            postalBefore,
            contacts
                .fields()
                .get(SportingPresentation.ContactField.POSTAL_CODE)
                .effectiveValue())) {
      club.setLocalityRevision(club.getLocalityRevision() + 1);
      club.setLatitude(null);
      club.setLongitude(null);
      club.setHasCoordinates(false);
      club.setGeocodedRevision(null);
    }
    if (contactChanged || nameChanged) changes.submit(Kind.CLUB, club.getId());
    club.setDetailCycleOrder(contacts.order() == null ? null : contacts.order().cycleOrder());
    club.setDetailReadOrdinal(contacts.order() == null ? null : contacts.order().readOrdinal());
    club.setDetailObservedAt(contacts.observedAt());
    club.setDetailPublishedAt(contacts.providerPublishedAt());
  }

  /** {@inheritDoc} */
  @Override
  public SportingPresentation.Locality locality(UUID id) {
    ClubEntity club = clubs.findById(id).orElseThrow(SportingResourceNotFoundException::new);
    return new SportingPresentation.Locality(
        Long.toString(club.getLocalityRevision()),
        club.getCity().toValue().effectiveValue(),
        club.getPostalCode().toValue().effectiveValue(),
        club.getCity().toValue().effectiveValue() == null ? null : club.getLatitude(),
        club.getCity().toValue().effectiveValue() == null ? null : club.getLongitude(),
        club.getLocalityCycleOrder() == null
            ? null
            : new ObservationOrder(club.getLocalityCycleOrder(), club.getLocalityReadOrdinal()));
  }

  /** {@inheritDoc} */
  @Override
  public void saveLocality(
      UUID id, SportingPresentation.LocalityObservation observation, ObservationOrder order) {
    ClubEntity club = clubs.findById(id).orElseThrow();
    boolean changed =
        !Objects.equals(club.getLatitude(), observation.latitude())
            || !Objects.equals(club.getLongitude(), observation.longitude());
    club.setLatitude(observation.latitude());
    club.setLongitude(observation.longitude());
    club.setHasCoordinates(observation.latitude() != null);
    club.setGeocodedRevision(club.getLocalityRevision());
    club.setLocalityCycleOrder(order.cycleOrder());
    club.setLocalityReadOrdinal(order.readOrdinal());
    if (changed) changes.submit(Kind.CLUB, id);
  }

  /** {@inheritDoc} */
  @Override
  public ObservationOrder sourceLogoOrder(UUID id) {
    TeamEntity team = teams.findById(id).orElseThrow(SportingResourceNotFoundException::new);
    return team.getLogoCycleOrder() == null
        ? null
        : new ObservationOrder(team.getLogoCycleOrder(), team.getLogoReadOrdinal());
  }

  /** {@inheritDoc} */
  @Override
  public boolean saveSourceLogo(
      UUID id,
      SportingPresentation.Image image,
      ObservationOrder order,
      MatchObservation.Context context) {
    TeamEntity team = teams.findById(id).orElseThrow();
    boolean changed = !sameImage(image, image(team.getSourceLogo(), team.getSourceLogoMediaType()));
    if (changed) {
      team.setSourceLogo(image.bytes());
      team.setSourceLogoMediaType(image.mediaType());
      team.setSourceLogoSize(image.bytes().length);
      team.setPresentationRevision(team.getPresentationRevision() + 1);
      changes.submit(Kind.TEAM, id);
    }
    team.setLogoCycleOrder(order.cycleOrder());
    team.setLogoReadOrdinal(order.readOrdinal());
    team.setLogoObservedAt(context.observedAt().toInstant());
    team.setLogoPublishedAt(
        context.providerPublishedAt() == null ? null : context.providerPublishedAt().toInstant());
    return changed;
  }

  /** {@inheritDoc} */
  @Override
  public Optional<SportingPresentation.Image> effectiveLogo(Kind kind, UUID id) {
    return switch (kind) {
      case CLUB -> clubs.findById(id).map(club -> image(club.getLogo(), club.getLogoMediaType()));
      case DIVISION ->
          divisions
              .findById(id)
              .map(division -> image(division.getLogo(), division.getLogoMediaType()));
      case TEAM ->
          teams
              .findById(id)
              .flatMap(
                  team -> {
                    if (team.getLogo() != null)
                      return Optional.of(image(team.getLogo(), team.getLogoMediaType()));
                    if (team.getProvider() == CollectionProviderEnum.LNV
                        && team.getSourceLogo() != null)
                      return Optional.of(
                          image(team.getSourceLogo(), team.getSourceLogoMediaType()));
                    return team.getClub() == null
                        ? Optional.empty()
                        : effectiveLogo(Kind.CLUB, team.getClub().getId());
                  });
      default -> Optional.empty();
    };
  }
}
