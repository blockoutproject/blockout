package com.blockout.backend.sporting.application.service;

import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.MatchObservation.Result;
import com.blockout.backend.sporting.application.model.MatchSchedule;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.SportingViews.PoolView;
import com.blockout.backend.sporting.application.model.SportingVisibility;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Sporting locks and current facts for contributions and notifications. */
@Service
@RequiredArgsConstructor
public class MatchContributionAccess {
  private final SportingStore store;
  private final ReadSportingData reads;

  /**
   * Locks the sporting roots and reads current contribution facts, including professional status.
   *
   * @param matchId retained match identity
   * @return current facts under retained roots
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public Facts lock(UUID matchId) {
    lockMatch(matchId);
    return facts(matchId);
  }

  /** Reads the sporting inputs for live classification under the same roots as publication. */
  @Transactional(propagation = Propagation.MANDATORY)
  public LinkAnnouncementFacts lockForLinkAnnouncement(UUID matchId) {
    lockMatch(matchId);
    Instant reliableStart = store.matchSchedule(matchId).reliableStart();
    MatchView match = requireMatch(matchId);
    boolean viewable = viewable(matchId);
    boolean definitiveResult = reads.hasDefinitiveMatchResult(matchId);
    return new LinkAnnouncementFacts(match, reliableStart, definitiveResult, viewable);
  }

  /**
   * Locks the season, the pool's currently classified division when present, and the match in that
   * order. Callers needing an account lock acquire it afterward.
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public void lockMatch(UUID matchId) {
    UUID poolId = store.matchPoolId(matchId).orElseThrow(SportingResourceNotFoundException::new);
    store.lockPoolSeason(poolId);
    lockDivisionForPool(poolId);
    store.lockMatch(matchId);
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
    PoolView pool = store.pool(poolId).orElseThrow(SportingResourceNotFoundException::new);
    if (pool.classification() != null) {
      store
          .lockDivision(pool.classification().divisionId())
          .orElseThrow(SportingResourceNotFoundException::new);
    }
  }

  /**
   * Reads current facts without locking sporting roots; callers use a coherent read transaction.
   *
   * @param matchId retained identity
   * @return current detached context, including hidden or dateless state
   */
  @Transactional(readOnly = true)
  public Facts read(UUID matchId) {
    return facts(matchId);
  }

  private Facts facts(UUID matchId) {
    MatchSchedule schedule = store.matchSchedule(matchId);
    MatchView match = requireMatch(matchId);
    boolean viewable = viewable(matchId);
    boolean professional =
        store.team(match.homeTeamId()).orElseThrow().professional()
            || store.team(match.awayTeamId()).orElseThrow().professional();
    Result result = store.matchResult(matchId);
    return new Facts(match, schedule, result, viewable, professional);
  }

  private MatchView requireMatch(UUID matchId) {
    return store.match(matchId).orElseThrow(SportingResourceNotFoundException::new);
  }

  private boolean viewable(UUID matchId) {
    return reads.visibility(Kind.MATCH, matchId).filter(SportingVisibility::viewable).isPresent();
  }

  /**
   * Current sporting inputs to link announcement processing.
   *
   * @param match current match and audience identities
   * @param reliableStart confirmed start instant, or null while unknown
   * @param definitiveResult explicit source finality
   * @param viewable current sporting restrictions permit public viewing
   */
  public record LinkAnnouncementFacts(
      MatchView match, Instant reliableStart, boolean definitiveResult, boolean viewable) {}

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
      return Result.isFinal(result);
    }
  }
}
