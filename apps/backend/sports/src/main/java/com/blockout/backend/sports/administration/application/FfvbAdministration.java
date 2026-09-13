package com.blockout.backend.sports.administration.application;

import java.time.Clock;
import java.util.*;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Owns short reference/configuration transactions and explicit source selection rules. */
public class FfvbAdministration {
  private static final Set<String> EXCLUDED = Set.of("LIGU", "LIGY", "LIMART", "LIMY", "LIRE");
  private final FfvbAdministrationStore store;
  private final Clock clock;

  /**
   * Binds reference operations to their persistence boundary and audit clock.
   *
   * @param store transactional sports persistence
   * @param clock audit time source
   */
  public FfvbAdministration(FfvbAdministrationStore store, Clock clock) {
    this.store = store;
    this.clock = clock;
  }

  /**
   * Reads the singleton and source set from one coherent database snapshot.
   *
   * @return local configuration without provider calls or writes
   */
  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public FfvbConfigurationView configuration() {
    return store.configuration();
  }

  /**
   * Replaces future collection configuration; existing published data is untouched.
   *
   * @param command transport-validated replacement
   * @param actor authenticated administrator ID
   * @return invalid for an excluded source or missing enabled-season/source selection
   */
  @Transactional(timeout = 5)
  public ReferenceResult<FfvbConfigurationView> configure(
      FfvbConfigurationCommand command, UUID actor) {
    if (command.sources().stream().anyMatch(EXCLUDED::contains)
        || (command.enabled() && (command.season() == null || command.sources().isEmpty()))) {
      return new ReferenceResult<>(ReferenceChange.INVALID, null);
    }
    if (command.season() != null
        && Integer.parseInt(command.season().substring(5))
            != Integer.parseInt(command.season().substring(0, 4)) + 1) {
      return new ReferenceResult<>(ReferenceChange.INVALID, null);
    }
    store.replaceConfiguration(command, actor, clock.instant());
    return new ReferenceResult<>(ReferenceChange.APPLIED, store.configuration());
  }

  /**
   * Lists local divisions in stable order.
   *
   * @param page zero-based page
   * @param size validated capacity
   * @return bounded slice
   */
  public SportsSlice<DivisionView> divisions(int page, int size) {
    return store.divisions(page, size);
  }

  /**
   * Creates one division with a fresh public ID.
   *
   * @param command validated division fields
   * @param actor local administrator
   * @return created division or an existing-name conflict
   */
  @Transactional(timeout = 5)
  public ReferenceResult<DivisionView> createDivision(DivisionCommand command, UUID actor) {
    return store.division(UUID.randomUUID(), command, actor, clock.instant(), true);
  }

  /**
   * Replaces a division, preserving its public ID and historical references.
   *
   * @param id target division
   * @param command validated replacement
   * @param actor local administrator
   * @return updated, missing or name conflict
   */
  @Transactional(timeout = 5)
  public ReferenceResult<DivisionView> replaceDivision(
      UUID id, DivisionCommand command, UUID actor) {
    return store.division(id, command, actor, clock.instant(), false);
  }

  /**
   * Reads explicit observed labels without guessing classifications.
   *
   * @param page zero-based page
   * @param size validated capacity
   * @param mapped optional mapping filter
   * @param activeOnly exclude inactive division mappings for the scraper
   * @return bounded label slice
   */
  public SportsSlice<FfvbMappingView> mappings(
      int page, int size, Boolean mapped, boolean activeOnly) {
    return store.mappings(page, size, mapped, activeOnly);
  }

  /**
   * Associates one observed provider label with its administrator-selected classification.
   *
   * @param id existing observed mapping
   * @param command validated classification
   * @param actor local administrator
   * @return applied mapping or missing/reference conflict
   */
  @Transactional(timeout = 5)
  public ReferenceResult<FfvbMappingView> map(UUID id, FfvbMappingCommand command, UUID actor) {
    return store.mapping(id, command, actor, clock.instant());
  }
}
