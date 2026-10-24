package com.blockout.backend.sporting.application.port;

import com.blockout.backend.sporting.application.SportingProjectionChanges.Scope;
import com.blockout.backend.sporting.application.model.SportingPublicInput;
import com.blockout.backend.sporting.application.model.SportingVisibility;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/** Current public eligibility and immutable projection inputs, independent of any search index. */
public interface SportingReadStore {
  /**
   * Resolves all current restrictions, without deleting retained facts.
   *
   * @param kind resource owner kind
   * @param id stable identity from a direct link, follow or index
   * @return current decision, empty only for an unknown identity
   */
  Optional<SportingVisibility> visibility(Kind kind, UUID id);

  /**
   * Resolves current public team links within one pool without hydrating search presentation.
   *
   * @param poolId retained official-table scope
   * @return visible current participant identities, empty for an unknown or hidden pool
   */
  Set<UUID> viewablePoolTeamIds(UUID poolId);

  /**
   * Hydrates only currently eligible club/team/pool inputs from canonical data.
   *
   * @param kind requested indexable kind; MATCH has no search inputs
   * @param ids bounded identities to recheck, at most 200
   * @return immutable current inputs, omitting hidden or unknown identities
   */
  List<SportingPublicInput> publicInputs(Kind kind, Set<UUID> ids);

  /**
   * Pages current eligible identities for a consumer-owned rebuild.
   *
   * @param kind club/team/pool index kind
   * @param page zero-based page in stable UUID order
   * @param size page size from 1 through 200
   * @return bounded current inputs; an empty page ends traversal
   */
  List<SportingPublicInput> projectionInputs(Kind kind, int page, int size);

  /**
   * Expands owner scopes in batches, including hidden retained identities needing index removal.
   *
   * @param scopes changed owner scopes
   * @return club/team/pool identities and dependents, without public values
   */
  Set<Scope> projectionDependents(Set<Scope> scopes);
}
