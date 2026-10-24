package com.blockout.backend.sporting.application.service;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.MatchObservation.Result;
import com.blockout.backend.sporting.application.model.MatchSchedule;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.SportingVisibility;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Sporting owner boundary for link commands and due processing; entities stay private. */
@Service
@RequiredArgsConstructor
public class MatchContributionAccess {
  private final SportingStore store;
  private final SportingReadService reads;

  /**
   * Locks season, current division and match in owner order before any account lock.
   *
   * @param matchId retained match identity
   * @return current facts under retained roots
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public Facts lock(UUID matchId) {
    UUID poolId = store.matchPoolId(matchId).orElseThrow(SportingResourceNotFoundException::new);
    store.lockPoolSeason(poolId);
    lockDivisionForPool(poolId);
    MatchSchedule schedule = store.lockMatchSchedule(matchId);
    return facts(matchId, schedule);
  }

  /**
   * Stabilizes current division activity after its season lock and before any match/account lock.
   * Published classification is held by the caller's season lock; no copied visibility flag is
   * used.
   *
   * @param poolId pool in the already locked season
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public void lockDivisionForPool(UUID poolId) {
    com.blockout.backend.sporting.application.model.SportingViews.PoolView pool =
        store.pool(poolId).orElseThrow(SportingResourceNotFoundException::new);
    if (pool.classification() != null)
      store
          .lockDivision(pool.classification().divisionId())
          .orElseThrow(SportingResourceNotFoundException::new);
  }

  /**
   * Reads current facts without locking sporting roots; callers use a coherent read transaction.
   *
   * @param matchId retained identity
   * @return current detached context, including hidden or dateless state
   */
  @Transactional(readOnly = true)
  public Facts read(UUID matchId) {
    // The schedule read must not acquire a write lock for private read contexts.
    return facts(matchId, store.matchSchedule(matchId));
  }

  /**
   * Composes only F02-owned facts; contribution and announcement policy remain with their owners.
   *
   * @param matchId existing identity
   * @param schedule current schedule read under the caller's transaction
   * @return detached owner facts
   */
  private Facts facts(UUID matchId, MatchSchedule schedule) {
    MatchView match = store.match(matchId).orElseThrow(SportingResourceNotFoundException::new);
    boolean viewable =
        reads.visibility(Kind.MATCH, matchId).filter(SportingVisibility::viewable).isPresent();
    boolean professional =
        store.team(match.homeTeamId()).orElseThrow().provider() == CollectionProviderEnum.LNV
            || store.team(match.awayTeamId()).orElseThrow().provider()
                == CollectionProviderEnum.LNV;
    Result result = store.matchDetails(matchId).result();
    return new Facts(match, schedule, result, viewable, professional);
  }

  /**
   * Current immutable sporting context, never authorization for a later command.
   *
   * @param match original match and participant identities
   * @param schedule current schedule with unknown time preserved
   * @param result current explicit result, or null
   * @param viewable current accumulated sporting restrictions permit public viewing
   * @param professional either participant uses F02's designated professional identity
   */
  public record Facts(
      MatchView match,
      MatchSchedule schedule,
      Result result,
      boolean viewable,
      boolean professional) {
    /**
     * @return explicit source finality, independent of presentation categories
     */
    public boolean definitiveResult() {
      return result != null && result.state() == ResultStateEnum.FINAL;
    }
  }
}
