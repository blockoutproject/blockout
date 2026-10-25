package com.blockout.backend.collection.application.service;

import com.blockout.backend.collection.application.exception.CollectionNotFoundException;
import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.model.CollectionState.Candidate;
import com.blockout.backend.collection.application.model.CollectionState.Control;
import com.blockout.backend.collection.application.model.CollectionState.ControlWork;
import com.blockout.backend.collection.application.model.CollectionState.Cycle;
import com.blockout.backend.collection.application.model.CollectionState.ServedTarget;
import com.blockout.backend.collection.application.model.CollectionState.SnapshotPage;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.model.CollectionState.TargetPage;
import com.blockout.backend.collection.application.model.CollectionState.Work;
import com.blockout.backend.collection.application.model.CollectionWorkMapper;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.backend.generated.ingestion.model.CollectionSeasonStateEnum;
import com.blockout.backend.sporting.application.model.SportingViews.CollectionSeasonView;
import com.blockout.backend.sporting.application.service.ReadCollectionSeasons;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reads retained collector state and current eligible work without admission or provider effects.
 */
@Service
@RequiredArgsConstructor
public class ReadCollectionWork {
  private final CollectionStore store;
  private final CollectionWorkMapper mapper;
  private final CollectorRuntimeAccess runtimeAccess;
  private final CollectionCycleAccess cycleAccess;
  private final ReadCollectionSeasons seasonReads;
  private final ReadClubAcquisition clubs;

  /**
   * Reads the current environment registration.
   *
   * @return the current runtime without registering or admitting work
   */
  @Transactional(readOnly = true)
  public CollectionState.Runtime current() {
    return store.runtime();
  }

  /**
   * Serves one bounded page of authorized targets.
   *
   * @param cycleId running current control
   * @param page zero-based page validated against the generated contract's safe range
   * @param size page size validated against the generated contract's 1–200 bound
   * @return frozen configuration with current permitted locality; no provider observation occurs
   */
  @Transactional
  public TargetPage targets(UUID cycleId, long page, int size) {
    cycleAccess.requireRunningControl(cycleId);
    if (page > Integer.MAX_VALUE / size) return new TargetPage(List.of(), page, false);
    SnapshotPage snapshot = store.targets(cycleId, (int) page, size);
    List<ServedTarget> targets = clubs.serve(snapshot.items());
    return new TargetPage(targets, page, snapshot.hasNext());
  }

  /**
   * Projects current scheduling intent without consuming it.
   *
   * @param incarnationId registered current process
   * @return read-only current intent; obsolete validations are never requeued
   */
  @Transactional
  public Work work(UUID incarnationId) {
    runtimeAccess.requireCurrent(incarnationId);
    List<Control> configuration = store.controls();
    List<Source> pending =
        store.pendingValidations().stream().filter(source -> !source.locked()).toList();
    Map<UUID, Cycle> contexts =
        store.cycles(
            configuration.stream()
                .map(Control::currentCycleId)
                .filter(Objects::nonNull)
                .distinct()
                .toList());
    Set<UUID> seasonIds = new HashSet<>();
    for (Control control : configuration) {
      if (control.seasonId() != null) seasonIds.add(control.seasonId());
    }
    for (Source source : pending) seasonIds.add(source.seasonId());
    Map<UUID, CollectionSeasonView> seasonStates = seasonReads.collectionStates(seasonIds);
    List<ControlWork> controls = new ArrayList<>();
    for (Control control : configuration) {
      CollectionSeasonStateEnum state =
          control.seasonId() == null
              ? null
              : seasonStates.get(control.seasonId()).collectionState();
      Cycle context =
          control.currentCycleId() == null ? null : contexts.get(control.currentCycleId());
      UUID running =
          context != null && context.state() == CollectionCycleStateEnum.RUNNING
              ? context.id()
              : null;
      controls.add(mapper.toView(control, state, running));
    }
    List<Candidate> candidates =
        pending.stream()
            .filter(
                source ->
                    seasonStates.get(source.seasonId()).collectionState()
                        != CollectionSeasonStateEnum.CLOSED)
            .map(source -> mapper.toCandidate(source, seasonStates.get(source.seasonId())))
            .toList();
    return new Work(controls, candidates);
  }

  /**
   * Reads retained state without admitting work.
   *
   * @param id retained cycle identity
   * @return current state, including interrupted old work; this read admits nothing
   * @throws CollectionNotFoundException when no retained cycle has this identity
   */
  @Transactional(readOnly = true)
  public Cycle get(UUID id) {
    return store.cycle(id).orElseThrow(CollectionNotFoundException::new);
  }
}
