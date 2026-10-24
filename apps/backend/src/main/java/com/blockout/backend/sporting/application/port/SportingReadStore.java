package com.blockout.backend.sporting.application.port;

import com.blockout.backend.sporting.application.SportingProjectionChanges.Scope;
import com.blockout.backend.sporting.application.model.SportingPublicInput;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.model.SportingViews.TeamView;
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
   * Selects distinct seasons from currently viewable teams without hydrating search inputs.
   *
   * @param clubId exact retained organization
   * @return canonical seasons newest first; closure alone never hides history
   */
  List<SeasonView> viewableClubSeasons(UUID clubId);

  /**
   * Selects every currently viewable team in an exact club season. The caller retains the admitted
   * club and season in the same read transaction for subsequent presentation mapping.
   *
   * @param clubId exact retained organization
   * @param seasonId exact canonical season without fallback
   * @return detached team identities; their owner presentation remains readable in this transaction
   */
  List<TeamView> viewableClubTeams(UUID clubId, UUID seasonId);

  /**
   * Resolves current viewable participations without hydrating search aliases or terms.
   *
   * @param teamId exact seasonal team
   * @return current visible pool identities in stable UUID order
   */
  List<UUID> viewableTeamPoolIds(UUID teamId);

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
