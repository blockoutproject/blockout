package com.blockout.backend.search.application;

import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Native derived-index lifecycle; callers serialize operations outside SQL transactions. */
public interface SearchProjectionWriter {
  /**
   * @return fresh unpublished indexes for all three searchable resource kinds
   */
  Map<Kind, String> createGeneration();

  /**
   * Writes one bounded current batch to an unpublished generation, checking every item.
   *
   * @param index owned candidate index
   * @param documents at most 200 current public documents
   */
  void write(String index, List<SearchDocuments> documents);

  /**
   * Updates eligible identities and removes absent ones through an existing resource alias.
   *
   * @param kind club, team or pool
   * @param ids at most 200 current affected identities
   * @param documents current eligible inputs; missing identities must be deleted
   */
  void update(Kind kind, Set<UUID> ids, List<SearchDocuments> documents);

  /**
   * Refreshes candidates and atomically publishes all three aliases; resolves uncertain outcomes.
   *
   * @param generation complete unpublished resource indexes
   */
  void publish(Map<Kind, String> generation);

  /** Rechecks native aliases before bounded inactive-generation cleanup; logs cleanup failure. */
  void cleanup();
}
