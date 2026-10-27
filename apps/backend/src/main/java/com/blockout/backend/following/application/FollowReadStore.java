package com.blockout.backend.following.application;

import java.util.List;
import java.util.UUID;

/**
 * Persistence projections for current personal options; no managed sporting or account data
 * escapes.
 */
public interface FollowReadStore {
  /**
   * Projects distinct viewable catalog/follow seasons using current sporting visibility.
   *
   * @param accountId original account within the caller's read transaction
   * @return choices ordered by descending sporting start year, then ascending UUID
   */
  List<SeasonChoice> seasons(UUID accountId);

  /**
   * One scalar season projection and whether this original owner has a viewable follow in it.
   *
   * @param id canonical F02 season
   * @param startYear sporting start year, independent from the device's calendar year
   * @param label current public season label
   * @param followed whether at least one eligible team or pool is followed by this account
   */
  record SeasonChoice(UUID id, long startYear, String label, boolean followed) {}
}
