package com.blockout.backend.sporting.support;

import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingViews.MatchView;
import com.blockout.backend.sporting.application.model.SportingViews.PoolView;
import com.blockout.backend.sporting.application.model.TeamCandidate;
import com.blockout.backend.sporting.application.port.SportingStore;
import com.blockout.backend.sporting.application.service.EstablishMatchIdentity;
import com.blockout.backend.sporting.application.service.MatchContributionAccess;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;

/**
 * Explicitly imported database fixture for suites needing accepted sporting identities. It creates
 * pools through the real persistence port and supplies the production identity participant's root
 * locks. It is not scanned as an application service or an alternative ingestion path.
 */
@RequiredArgsConstructor
public class SportingIdentityFixture {
  private final SportingStore store;
  private final EstablishMatchIdentity identities;
  private final MatchContributionAccess roots;

  /**
   * Persists a new synthetic pool; callers supply valid owner facts and a distinct native key.
   *
   * @param key synthetic provider/season identity
   * @param packReference synthetic source grouping
   * @param sourceName synthetic label
   * @param classification accepted classification for the scenario
   * @return the new stored pool
   */
  @Transactional
  public PoolView createPool(
      PoolKey key, String packReference, String sourceName, SportingClassification classification) {
    store.lockSeason(key.seasonId());
    store.lockDivision(classification.divisionId()).orElseThrow();
    return store.createPool(key, packReference, sourceName, classification);
  }

  /**
   * Runs the real identity participant under the same sporting roots as calendar acceptance. Tests
   * of observation admission use AcceptCalendar instead; this fixture supplies identity only.
   *
   * @param poolId existing synthetic accepted pool
   * @param reference native encounter reference
   * @param home scenario's home participant
   * @param away scenario's away participant
   * @return the production participant's stable match result
   */
  @Transactional
  public MatchView identifyMatch(
      UUID poolId, String reference, TeamCandidate home, TeamCandidate away) {
    store.lockPoolSeason(poolId);
    roots.lockDivisionForPool(poolId);
    store.match(poolId, reference).ifPresent(match -> store.lockMatchSchedule(match.id()));
    return identities.identifyMatch(poolId, reference, home, away);
  }
}
