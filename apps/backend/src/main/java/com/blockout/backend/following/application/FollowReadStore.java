package com.blockout.backend.following.application;

import com.blockout.backend.sporting.application.ConsultationMatchSelection;
import java.util.List;
import java.util.UUID;

/**
 * Persistence selections for current personal lists, options and calendars; no managed sporting or
 * account data escapes.
 */
public interface FollowReadStore {
  /**
   * Selects an original owner's currently visible targets in native French name/UUID order.
   *
   * @param accountId admitted original account
   * @param type exact team or pool relation kind
   * @param seasonId canonical optional season, or null for all seasons
   * @param page validated zero-based page within {@link ReadFollowLists#MAX_PAGE}
   * @return up to twenty identities and whether one more eligible identity exists
   */
  TargetPage targets(UUID accountId, FollowContext.TargetType type, UUID seasonId, long page);

  /**
   * Detached page selection, without Spring Data values crossing the persistence boundary.
   *
   * @param ids current original identities in stable presentation order
   * @param hasNext whether a lookahead row establishes a further page
   */
  record TargetPage(List<UUID> ids, boolean hasNext) {
    /**
     * Detaches the selection while preserving its native database order.
     *
     * @param ids current ordered sporting identities
     * @param hasNext whether the native lookahead found another eligible row
     */
    public TargetPage {
      ids = List.copyOf(ids);
    }
  }

  /**
   * Projects distinct viewable catalog/follow seasons using current sporting visibility.
   *
   * @param accountId original account within the caller's read transaction
   * @return choices ordered by descending sporting start year, then ascending UUID
   */
  List<SeasonChoice> seasons(UUID accountId);

  /**
   * Selects the union of this owner's team and pool follows before F03 pages complete days.
   *
   * @param accountId admitted original account
   * @param seasonId exact optional sporting season, or null for all seasons
   * @return database predicate over scalar match identities; F03 retains visibility ownership
   */
  ConsultationMatchSelection.Filter calendarSelection(UUID accountId, UUID seasonId);

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
