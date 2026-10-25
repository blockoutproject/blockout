package com.blockout.backend.collection.application.service;

import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.collection.application.exception.CollectionNotFoundException;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.model.CollectionState.Control;
import com.blockout.backend.collection.application.model.CollectionState.ControlView;
import com.blockout.backend.collection.application.model.CollectionState.Cycle;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.backend.generated.ingestion.model.SourceValidationStateEnum;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionResourcePage;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import com.blockout.backend.sporting.application.service.ReadCollectionSeasons;
import com.blockout.backend.sporting.application.service.ReadSportingAcquisition;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Current operator configuration and evidence; reads never admit, retry or resume collection. */
@Service
@RequiredArgsConstructor
public class ReadCollectionConfiguration {
  private final CollectionStore store;
  private final ReadCollectionSeasons seasonReads;
  private final ReadSportingAcquisition acquisitionReads;
  private final CurrentPermissions permissions;

  /**
   * Combines current intent and retained cycle without mutating interrupted execution.
   *
   * @param control detached current configuration
   * @return independent intent and retained execution evidence
   */
  @Transactional(
      readOnly = true,
      propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
  ControlView controlView(Control control) {
    Cycle cycle =
        control.currentCycleId() == null
            ? null
            : store.cycle(control.currentCycleId()).orElse(null);
    return new ControlView(control, cycle);
  }

  /**
   * Reads current status after an uncertain command without repeating it.
   *
   * @param accountId current operator
   * @param id independent control
   * @return current desired, pending and confirmed execution state
   */
  @Transactional(readOnly = true)
  public ControlView control(UUID accountId, UUID id) {
    permissions.requireForRead(accountId, Permission.MANAGE_COLLECTION);
    return controlView(store.control(id).orElseThrow(CollectionNotFoundException::new));
  }

  /**
   * Reads a complete family-then-identity list without admission or provider calls.
   *
   * @param accountId current operator
   * @param seasonId selected competition season, or null for seasonless controls
   * @return desired intent with independently retained cycle and freshness evidence
   */
  @Transactional(readOnly = true)
  public List<ControlView> controls(UUID accountId, UUID seasonId) {
    permissions.requireForRead(accountId, Permission.MANAGE_COLLECTION);
    if (seasonId != null) seasonReads.collectionState(seasonId);
    List<Control> controls = store.controls(seasonId);
    Map<UUID, Cycle> cycles =
        store.cycles(
            controls.stream()
                .map(Control::currentCycleId)
                .filter(Objects::nonNull)
                .distinct()
                .toList());
    return controls.stream()
        .sorted(
            Comparator.comparing((Control control) -> control.family().getValue())
                .thenComparing(Control::id))
        .map(
            control ->
                new ControlView(
                    control,
                    control.currentCycleId() == null ? null : cycles.get(control.currentCycleId())))
        .toList();
  }

  /**
   * Identifies pending intent whose projection depends on a retained admitted context.
   *
   * @param source current binding
   * @return whether the source needs its cycle's current interruption state
   */
  private boolean hasPendingCycle(Source source) {
    return source.validationState() == SourceValidationStateEnum.PENDING
        && source.currentCycleId() != null;
  }

  /**
   * Prevents obsolete pending work from appearing active without changing persisted state.
   *
   * @param source persisted current source
   * @return unvalidated projection for interrupted or concurrently replaced validation
   */
  @Transactional(
      readOnly = true,
      propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
  Source sourceView(Source source) {
    return sourceView(List.of(source)).getFirst();
  }

  /**
   * Projects pending validation contexts in one lookup while preserving the supplied source order.
   *
   * @param sources current bindings; accepted and never-admitted states remain unchanged
   * @return detached states; interrupted or concurrently discarded contexts project as unvalidated
   */
  private List<Source> sourceView(List<Source> sources) {
    Map<UUID, Cycle> contexts =
        store.cycles(
            sources.stream()
                .filter(this::hasPendingCycle)
                .map(Source::currentCycleId)
                .distinct()
                .toList());
    return sources.stream()
        .map(
            source -> {
              if (!hasPendingCycle(source)) return source;
              Cycle cycle = contexts.get(source.currentCycleId());
              return cycle == null || cycle.state() == CollectionCycleStateEnum.INTERRUPTED
                  ? source.toBuilder()
                      .validationState(SourceValidationStateEnum.UNVALIDATED)
                      .build()
                  : source;
            })
        .toList();
  }

  /**
   * Reads bounded discovered children without contacting a provider or filtering by mapping.
   *
   * @param accountId current local operator
   * @param sourceId selected source binding
   * @param parentId optional pack in this binding
   * @param page validated zero-based page
   * @param size validated size, at most 200
   * @return native direct children without classification state
   */
  @Transactional(readOnly = true)
  public CollectionResourcePage children(
      UUID accountId, UUID sourceId, UUID parentId, long page, int size) {
    permissions.requireForRead(accountId, Permission.MANAGE_COLLECTION);
    Source source = store.source(sourceId).orElseThrow(CollectionNotFoundException::new);
    if (page > Integer.MAX_VALUE / size) return new CollectionResourcePage(List.of(), page, false);
    return acquisitionReads.collectionChildren(
        source.seasonId(),
        source.provider(),
        source.organizerReference(),
        parentId,
        (int) page,
        size);
  }

  /**
   * Reads current source evidence without requeuing an interrupted validation.
   *
   * @param accountId current local operator
   * @param sourceId binding identity
   * @return current candidate and accepted reference
   */
  @Transactional(readOnly = true)
  public Source source(UUID accountId, UUID sourceId) {
    permissions.requireForRead(accountId, Permission.MANAGE_COLLECTION);
    return sourceView(store.source(sourceId).orElseThrow(CollectionNotFoundException::new));
  }

  /**
   * Lists supported and proposed roots without classification readiness.
   *
   * @param accountId current local operator
   * @param seasonId canonical season
   * @return ordered source configuration, projecting obsolete validation honestly
   */
  @Transactional(readOnly = true)
  public List<Source> sources(UUID accountId, UUID seasonId) {
    permissions.requireForRead(accountId, Permission.MANAGE_COLLECTION);
    seasonReads.collectionState(seasonId);
    return sourceView(store.sources(seasonId));
  }

  /**
   * Reads one canonical preparation revision without changing it.
   *
   * @param accountId current local operator
   * @param seasonId canonical season
   * @return current preparation state
   */
  @Transactional(readOnly = true)
  public CollectionSeasonView season(UUID accountId, UUID seasonId) {
    permissions.requireForRead(accountId, Permission.MANAGE_COLLECTION);
    return seasonReads.collectionState(seasonId);
  }

  /**
   * Reads the complete canonical season configuration without discovery or provider calls.
   *
   * @param accountId current local operator
   * @return newest-first configuration, including closed history
   */
  @Transactional(readOnly = true)
  public List<CollectionSeasonView> seasons(UUID accountId) {
    permissions.requireForRead(accountId, Permission.MANAGE_COLLECTION);
    return seasonReads.collectionStates();
  }

  /**
   * Reads current evidence using the current collection-management grant.
   *
   * @param accountId original local account
   * @param controlId independent control
   * @param page validated zero-based page
   * @param size validated bounded size
   * @return canonical current evidence without a total count
   */
  @Transactional(readOnly = true)
  public CollectionState.ResultPage results(UUID accountId, UUID controlId, long page, int size) {
    permissions.requireForRead(accountId, Permission.MANAGE_COLLECTION);
    store.control(controlId).orElseThrow(CollectionNotFoundException::new);
    if (page > Integer.MAX_VALUE / size)
      return new CollectionState.ResultPage(List.of(), page, false);
    return store.results(controlId, (int) page, size);
  }
}
