package com.blockout.backend.collection.application.service;

import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.exception.InvalidSourceException;
import com.blockout.backend.collection.application.model.CollectionState.Control;
import com.blockout.backend.collection.application.model.CollectionState.Cycle;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.model.InitialCoverage;
import com.blockout.backend.collection.application.model.InitialReconstructionReport;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionModeEnum;
import com.blockout.backend.generated.ingestion.model.CollectionPhaseEnum;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import com.blockout.backend.generated.ingestion.model.SourceValidationStateEnum;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import com.blockout.backend.sporting.application.model.SportingViews.TeamView;
import com.blockout.backend.sporting.application.service.ChangeCollectionSeasons;
import com.blockout.backend.sporting.application.service.ReadSportingAcquisition;
import java.net.URI;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Backend-only operator boundary for explicitly selected initial reconstruction. */
@Service
@RequiredArgsConstructor
public class InitialReconstructionService {
  private final CollectionStore store;
  private final ChangeCollectionSeasons seasons;
  private final ReadCollectionConfiguration configurationReads;
  private final PrepareCollectionSources preparation;
  private final ActionAuthorization authorization;
  private final ReadSportingAcquisition acquisitionReads;

  /**
   * Retains one exact initial request without enabling periodic activity.
   *
   * @param operator current local account with collection permission
   * @param seasonId canonical open season
   * @param revision last read season preparation revision
   * @param sourceIds exact selected qualified roots
   * @param scopeIds optional failed scopes or explicitly selected parent pools of failed LNV logos;
   *     empty selects the supplied roots. A parent passage may integrate ordinary sporting facts
   *     and neighboring logos within that pool; a team UUID grants no logo-only capability.
   * @return accepted controls with pending identities for explicit rereads
   * @throws AccessDeniedException when the operator lacks the current collection grant
   * @throws SportingResourceNotFoundException when the canonical season is unknown
   * @throws CollectionConflictException for stale revisions, closed or active history, unqualified
   *     sources, unattributable retry scopes, or conflicting pending or running work
   */
  @Transactional
  public List<Control> request(
      UUID operator, UUID seasonId, long revision, Set<UUID> sourceIds, Set<UUID> scopeIds) {
    store.lockRuntime();
    CollectionSeasonView season = seasons.lockCollectionState(seasonId);
    List<Source> selected =
        store.sources(seasonId).stream().filter(source -> sourceIds.contains(source.id())).toList();
    List<Control> configured =
        new ArrayList<>(
            store.controls(seasonId).stream()
                .map(control -> store.lockControl(control.id()))
                .toList());
    for (CollectionProviderEnum provider :
        selected.stream().map(Source::provider).distinct().sorted().toList()) {
      if (configured.stream()
          .noneMatch(control -> control.family().getValue().equals(provider.getValue()))) {
        configured.add(store.prepareInitialControl(seasonId, provider));
      }
    }
    authorization.require(operator, Permission.MANAGE_COLLECTION);
    CollectionRevision.requireRevision(revision, season.collectionRevision());
    if (season.collectionState() != CollectionSeasonStateEnum.PREPARING
        || sourceIds.isEmpty()
        || selected.size() != sourceIds.size()
        || selected.stream()
            .anyMatch(
                source ->
                    source.validationState() != SourceValidationStateEnum.QUALIFIED
                        || (source.locked() ? source.acceptedUrl() : source.candidateUrl())
                            == null)) {
      throw new CollectionConflictException("conflict");
    }
    Map<UUID, Set<UUID>> retries = retryScopes(seasonId, selected, scopeIds);
    List<Control> accepted = new ArrayList<>();
    for (Control control : configured.stream().sorted(Comparator.comparing(Control::id)).toList()) {
      Set<UUID> roots =
          selected.stream()
              .filter(source -> source.provider().getValue().equals(control.family().getValue()))
              .map(Source::id)
              .collect(Collectors.toSet());
      if (roots.isEmpty()) {
        continue;
      }
      if (control.currentCycleId() != null
          && store
              .cycle(control.currentCycleId())
              .map(cycle -> cycle.state() == CollectionCycleStateEnum.RUNNING)
              .orElse(false)) {
        throw new CollectionConflictException("conflict");
      }
      Set<UUID> scopes =
          roots.stream()
              .flatMap(root -> retries.getOrDefault(root, Set.of()).stream())
              .collect(Collectors.toSet());
      if (control.requestId() != null) {
        if (control.requestedMode() != CollectionModeEnum.INITIAL_IMPORT
            || !control.sourceBindingIds().equals(roots)
            || !control.scopeIds().equals(scopes)) {
          throw new CollectionConflictException("conflict");
        }
        accepted.add(control);
      } else {
        CollectionRevision.requireAdvance(control.revision());
        accepted.add(store.setInitialIntent(control.id(), UUID.randomUUID(), roots, scopes));
      }
    }
    return List.copyOf(accepted);
  }

  /**
   * Attributes the exact operator selection to failed evidence under the same source. A failed logo
   * can justify one explicitly selected retained parent pool even when that pool's own stages
   * succeeded. Bounded report pages avoid materializing the season's complete coverage; admission
   * separately rechecks current eligibility before granting any provider work.
   *
   * @param seasonId locked canonical season
   * @param sources exact qualified roots supplied by the operator
   * @param scopeIds exact requested scopes, never expanded to other parents or an entire source
   * @return source-owned retry scopes; empty when the caller requested the supplied roots
   * @throws CollectionConflictException when a scope or source has no attributable failed evidence
   */
  private Map<UUID, Set<UUID>> retryScopes(
      UUID seasonId, List<Source> sources, Set<UUID> scopeIds) {
    if (scopeIds.isEmpty()) {
      return Map.of();
    }
    Map<UUID, Source> roots =
        sources.stream().collect(Collectors.toMap(Source::id, source -> source));
    Map<UUID, Set<UUID>> selected = new HashMap<>();
    Set<UUID> remaining = new HashSet<>(scopeIds);
    for (InitialCoverage row : store.initialCoverage(roots.keySet(), scopeIds)) {
      if (row.stage() != CollectionStageEnum.LOGO && failed(row)) {
        selected
            .computeIfAbsent(row.sourceBindingId(), ignored -> new HashSet<>())
            .add(row.scopeId());
        remaining.remove(row.scopeId());
      }
    }
    for (int page = 0; !remaining.isEmpty(); page++) {
      InitialCoverage.Page coverage = store.initialCoverage(seasonId, page, 200);
      for (InitialCoverage row : coverage.items()) {
        Source source = roots.get(row.sourceBindingId());
        if (source == null
            || source.provider() != CollectionProviderEnum.LNV
            || row.stage() != CollectionStageEnum.LOGO
            || !failed(row)) {
          continue;
        }
        TeamView team = acquisitionReads.team(row.scopeId()).orElse(null);
        if (team == null
            || team.provider() != CollectionProviderEnum.LNV
            || !team.seasonId().equals(source.seasonId())
            || !team.organizerReference().equals(source.organizerReference())) {
          continue;
        }
        for (UUID poolId : acquisitionReads.teamPools(team.id())) {
          if (remaining.contains(poolId)
              && acquisitionReads
                  .pool(poolId)
                  .filter(
                      pool ->
                          pool.key().provider() == source.provider()
                              && pool.key().seasonId().equals(source.seasonId())
                              && pool.key()
                                  .organizerReference()
                                  .equals(source.organizerReference()))
                  .isPresent()) {
            selected.computeIfAbsent(source.id(), ignored -> new HashSet<>()).add(poolId);
            remaining.remove(poolId);
          }
        }
      }
      if (!coverage.hasNext()) {
        break;
      }
    }
    if (!remaining.isEmpty() || !selected.keySet().equals(roots.keySet())) {
      throw new CollectionConflictException("conflict");
    }
    return selected;
  }

  /**
   * Recognizes attempted coverage without usable success, including interrupted requested work.
   *
   * @param row retained current initial evidence
   * @return whether the row justifies an explicit retry before closure
   */
  private static boolean failed(InitialCoverage row) {
    return row.cycleOrder() > 0 && row.status() != InitialCoverage.Status.OBTAINED;
  }

  /**
   * Prepares only the supplied sporting year and candidate, using canonical F02/F01 owners.
   *
   * @param operator current local account
   * @param startYear explicit sporting start year
   * @param provider supported authority
   * @param organizer native organizer or championship identity
   * @param url candidate reference awaiting ordinary qualification
   * @return reused qualified reference or pending validation
   * @throws IllegalArgumentException when the sporting year or provider is unsupported
   * @throws AccessDeniedException when the operator lacks the current collection grant
   * @throws InvalidSourceException when the candidate URL or organizer is unsupported
   * @throws CollectionConflictException when the season is closed, a locked reference differs, or
   *     the current preparation revision cannot advance
   */
  @Transactional
  public Source prepare(
      UUID operator, long startYear, CollectionProviderEnum provider, String organizer, URI url) {
    if (startYear < 0 || startYear >= 9_007_199_254_740_991L || provider == null) {
      throw new IllegalArgumentException("Explicit supported season and provider are required");
    }
    store.lockRuntime();
    UUID seasonId = seasons.getOrCreate(startYear).id();
    CollectionSeasonView season = seasons.lockCollectionState(seasonId);
    Source existing = store.source(seasonId, provider, organizer).orElse(null);
    if (existing != null) {
      existing = store.lockSource(existing.id());
    }
    authorization.require(operator, Permission.MANAGE_COLLECTION);
    CollectionLifecycle.requireOpen(season);
    Source source;
    if (existing == null) {
      source =
          preparation.create(
              operator, seasonId, season.collectionRevision(), provider, organizer, url);
    } else {
      if (!Objects.equals(
          existing.locked() ? existing.acceptedUrl() : existing.candidateUrl(), url.toString())) {
        if (existing.locked()) {
          throw new CollectionConflictException("conflict");
        }
        source = preparation.setCandidate(operator, existing.id(), existing.revision(), url);
      } else {
        source = existing;
      }
    }
    source = configurationReads.sourceView(source);
    if (source.validationState() == SourceValidationStateEnum.UNVALIDATED
        || source.validationState() == SourceValidationStateEnum.INVALID) {
      source = preparation.requestValidation(operator, source.id(), source.revision());
    }
    if (store
        .initialCoverage(
            source.id(),
            source.id(),
            CollectionStageEnum.DISCOVERY,
            CollectionPhaseEnum.ACQUISITION)
        .isEmpty()) {
      store.saveInitialCoverage(
          new InitialCoverage(
              source.id(),
              source.id(),
              CollectionStageEnum.DISCOVERY,
              CollectionPhaseEnum.ACQUISITION,
              InitialCoverage.Status.REQUESTED,
              null,
              0,
              0,
              null,
              null));
    }
    return configurationReads.sourceView(source);
  }

  /**
   * Reads current initial coverage without changing intent or contacting a source.
   *
   * @param operator current local account
   * @param seasonId canonical season
   * @param page zero-based page
   * @param size bounded page size
   * @return current requested, obtained, rejected and unavailable evidence
   * @throws AccessDeniedException when the operator lacks the current collection read grant
   * @throws SportingResourceNotFoundException when the canonical season is unknown
   * @throws IllegalArgumentException when the page is negative or size is outside 1–200
   */
  @Transactional(readOnly = true)
  public InitialCoverage.Page coverage(UUID operator, UUID seasonId, int page, int size) {
    configurationReads.season(operator, seasonId);
    return readCoverage(seasonId, page, size, configurationReads.sources(operator, seasonId));
  }

  /**
   * Exposes current preparation, intent and coverage for an explicit F14 review.
   *
   * @param operator current collection-authorized account
   * @param seasonId canonical season
   * @param page zero-based coverage page
   * @param size bounded coverage page size
   * @return current configuration and one coverage page, including missing qualification
   * @throws AccessDeniedException when the operator lacks the current collection read grant
   * @throws SportingResourceNotFoundException when the canonical season is unknown
   * @throws IllegalArgumentException when the page is negative or size is outside 1–200
   */
  @Transactional(readOnly = true)
  public InitialReconstructionReport report(UUID operator, UUID seasonId, int page, int size) {
    CollectionSeasonView season = configurationReads.season(operator, seasonId);
    List<Source> sources = configurationReads.sources(operator, seasonId);
    return new InitialReconstructionReport(
        season,
        sources,
        configurationReads.controls(operator, seasonId),
        readCoverage(seasonId, page, size, sources));
  }

  /**
   * Projects rejected preparation and unconfirmed interrupted work without mutating evidence.
   *
   * @param seasonId canonical report owner
   * @param page zero-based report page
   * @param size native bounded page size
   * @param sources current qualification projections
   * @return a stable current evidence page; absent or interrupted context never means success
   * @throws IllegalArgumentException when the page is negative or size is outside 1–200
   */
  private InitialCoverage.Page readCoverage(
      UUID seasonId, int page, int size, List<Source> sources) {
    if (page < 0 || size < 1 || size > 200) {
      throw new IllegalArgumentException("Invalid coverage page");
    }
    if (page > Integer.MAX_VALUE / size) {
      return new InitialCoverage.Page(List.of(), page, false);
    }
    InitialCoverage.Page result = store.initialCoverage(seasonId, page, size);
    Map<UUID, Source> bindings =
        sources.stream().collect(Collectors.toMap(Source::id, source -> source));
    Map<UUID, Cycle> cycles =
        store.cycles(
            result.items().stream()
                .map(InitialCoverage::cycleId)
                .filter(Objects::nonNull)
                .distinct()
                .toList());
    List<InitialCoverage> current =
        result.items().stream()
            .map(
                row -> {
                  InitialCoverage.Status status = row.status();
                  if (status == InitialCoverage.Status.REQUESTED) {
                    if (row.cycleId() == null) {
                      Source source = bindings.get(row.sourceBindingId());
                      if (source != null
                          && source.validationState() == SourceValidationStateEnum.INVALID) {
                        status =
                            RecordCollectionResults.isStructuralReason(source.reasonType())
                                ? InitialCoverage.Status.REJECTED
                                : InitialCoverage.Status.UNAVAILABLE;
                      }
                    } else {
                      Cycle cycle = cycles.get(row.cycleId());
                      if (cycle == null || cycle.state() != CollectionCycleStateEnum.RUNNING) {
                        status = InitialCoverage.Status.UNAVAILABLE;
                      }
                    }
                  }
                  return new InitialCoverage(
                      row.sourceBindingId(),
                      row.scopeId(),
                      row.stage(),
                      row.phase(),
                      status,
                      row.cycleId(),
                      row.cycleOrder(),
                      row.readOrdinal(),
                      row.obtainedCount(),
                      row.rejectedCount());
                })
            .toList();
    return new InitialCoverage.Page(current, page, result.hasNext());
  }
}
