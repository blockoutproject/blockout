package com.blockout.backend.sports.administration.application;

import java.time.Instant;
import java.util.*;

/**
 * Persistence boundary for local configuration; mutations participate in the caller's transaction.
 */
public interface FfvbAdministrationStore {
  /**
   * @return the configured singleton, initially disabled
   */
  FfvbConfigurationView configuration();

  /**
   * Replaces the singleton and its source set atomically in the caller transaction.
   *
   * @param command validated replacement
   * @param actor authenticated local administrator
   * @param now audit instant
   */
  void replaceConfiguration(FfvbConfigurationCommand command, UUID actor, Instant now);

  /**
   * Lists divisions by name and immutable ID.
   *
   * @param page zero-based offset page
   * @param size page capacity
   * @return a slice with at most size visible items
   */
  SportsSlice<DivisionView> divisions(int page, int size);

  /**
   * Creates or replaces a division without translating ordinary name conflicts into exceptions.
   *
   * @param id new or existing public identity
   * @param command replacement fields
   * @param actor local administrator
   * @param now audit instant
   * @param create whether the operation creates a resource
   * @return applied, missing or conflicting outcome
   */
  ReferenceResult<DivisionView> division(
      UUID id, DivisionCommand command, UUID actor, Instant now, boolean create);

  /**
   * Lists observed provider labels deterministically.
   *
   * @param page zero-based page
   * @param size capacity
   * @param mapped optional association filter
   * @param activeOnly whether only mappings to active divisions are usable
   * @return bounded mapping slice
   */
  SportsSlice<FfvbMappingView> mappings(int page, int size, Boolean mapped, boolean activeOnly);

  /**
   * Associates an existing observed label with an active division and explicit classifications.
   *
   * @param id observed mapping identity
   * @param command selected division, format and gender
   * @param actor local administrator
   * @param now audit instant
   * @return applied, missing or inactive/missing division conflict
   */
  ReferenceResult<FfvbMappingView> mapping(
      UUID id, FfvbMappingCommand command, UUID actor, Instant now);
}
