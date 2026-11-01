package com.blockout.backend.notifications.application;

import com.blockout.backend.notifications.application.AllocateAnnouncements.Entry;
import com.blockout.backend.notifications.domain.MatchAnnouncementFacts;
import java.time.Instant;
import java.util.UUID;

/** F07 writes: producer/read locks are caller ordered; retention deletes only due personal rows. */
public interface NotificationStore {
  /**
   * Removes this original account's personal data in the caller's erasure transaction. Retained
   * nonpersonal facts and other owners remain unchanged; acquires no domain root.
   *
   * @param accountId original lifecycle protected by its account row lock
   */
  void erase(UUID accountId);

  /**
   * Deletes all personal rows at the inclusive cutoff across owners/read/visibility states. The
   * caller owns one retention transaction; facts and installation associations are untouched.
   *
   * @param cutoff inclusive original creation cutoff, calculated once for this pass
   * @return affected row count; successful return alone does not establish commit
   */
  int deleteExpired(Instant cutoff);

  /**
   * Applies only true to an exact still-retained allocation after sporting and account locks.
   * Repetition succeeds; a removed row is never recreated.
   *
   * @param owner locked original owner
   * @param id exact personal allocation
   * @param now retention evaluation instant
   * @return whether the exact retained allocation still exists
   */
  boolean markRead(NotificationContext owner, UUID id, Instant now);

  /**
   * Reads minimal allowances after the caller holds the shared F02 match lock.
   *
   * @param matchId locked sporting identity
   * @return persisted facts, or unconsumed facts when absent
   */
  MatchAnnouncementFacts facts(UUID matchId);

  /**
   * Persists monotone consumed facts even when no recipient exists; failures must propagate.
   *
   * @param facts facts computed under the retained match lock
   */
  void saveFacts(MatchAnnouncementFacts facts);

  /**
   * Inserts one unread personal entry under its original account lock; failures abort this match.
   * An existing UUID must fail rather than merge into a retained entry or reset its read state.
   *
   * @param entry immutable allocation with no copied sporting text
   */
  void create(Entry entry);
}
