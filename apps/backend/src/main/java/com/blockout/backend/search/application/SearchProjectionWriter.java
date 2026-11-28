package com.blockout.backend.search.application;

import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Native derived-index lifecycle; callers serialize operations outside SQL transactions. */
public interface SearchProjectionWriter {
  /**
   * Creates fresh unpublished indexes for all three searchable resource kinds.
   *
   * @return the owned candidate index for each resource kind
   * @throws SearchUnavailableException when candidate creation is not acknowledged
   */
  Map<Kind, String> createGeneration();

  /**
   * Writes one bounded current batch to an unpublished generation, checking every item.
   *
   * @param index owned candidate index
   * @param documents at most 200 current public documents
   * @throws SearchUnavailableException when the batch is unavailable or any item fails
   */
  void write(String index, List<SearchDocuments> documents);

  /**
   * Updates eligible identities and removes absent ones through an existing resource alias.
   *
   * @param kind club, team or pool
   * @param ids at most 200 current affected identities
   * @param documents current eligible inputs; missing identities must be deleted
   * @throws SearchUnavailableException when the batch is unavailable or any item fails
   */
  void update(Kind kind, Set<UUID> ids, List<SearchDocuments> documents);

  /**
   * Refreshes candidates and atomically publishes all three aliases. An unacknowledged switch
   * propagates as failure without a confirmation read, replay or rollback.
   *
   * @param generation complete unpublished resource indexes
   * @throws SearchUnavailableException when refresh or publication is not confirmed
   */
  void publish(Map<Kind, String> generation);

  /**
   * Rechecks aliases for bounded cleanup after a confirmed publication; logs cleanup failure.
   * Failed/unconfirmed runs must leave their candidates until a later confirmed full run.
   */
  void cleanup();
}
