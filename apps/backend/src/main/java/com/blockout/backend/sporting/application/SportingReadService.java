package com.blockout.backend.sporting.application;

import com.blockout.backend.sporting.application.SportingViews.ClubView;
import com.blockout.backend.sporting.application.SportingViews.DivisionView;
import com.blockout.backend.sporting.application.SportingViews.MatchView;
import com.blockout.backend.sporting.application.SportingViews.PoolView;
import com.blockout.backend.sporting.application.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.SportingViews.TeamView;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Immutable owner reads for F01/F03/F04/F06; current public eligibility is added by its story. */
@Service
@Transactional(readOnly = true)
public class SportingReadService {
  private final SportingStore store;

  /**
   * Injects the identity persistence owner.
   *
   * @param store owner-controlled persistence
   */
  public SportingReadService(SportingStore store) {
    this.store = store;
  }

  /**
   * Reads a canonical season without lifecycle mutation.
   *
   * @param id canonical season
   * @return current identity
   */
  public Optional<SeasonView> season(UUID id) {
    return store.season(id);
  }

  /**
   * Reads the currently known persistent organization.
   *
   * @param id persistent organization
   * @return current known data
   */
  public Optional<ClubView> club(UUID id) {
    return store.club(id);
  }

  /**
   * Reads current division identity, state and search terms.
   *
   * @param id division owner
   * @return current identity/activity/search terms
   */
  public Optional<DivisionView> division(UUID id) {
    return store.division(id);
  }

  /**
   * Reads the established contextual pool.
   *
   * @param id contextual pool
   * @return current accepted identity/classification
   */
  public Optional<PoolView> pool(UUID id) {
    return store.pool(id);
  }

  /**
   * Reads the seasonal team without exposing persistence.
   *
   * @param id seasonal team
   * @return current identity/classification
   */
  public Optional<TeamView> team(UUID id) {
    return store.team(id);
  }

  /**
   * Reads the native encounter and its established participants.
   *
   * @param id stable encounter
   * @return its current participant identities
   */
  public Optional<MatchView> match(UUID id) {
    return store.match(id);
  }
}
