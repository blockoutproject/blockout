package com.blockout.backend.notifications.application;

import com.blockout.backend.notifications.domain.MatchAnnouncementFacts;
import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.notifications.domain.NotificationVariant;
import java.time.Instant;
import java.util.UUID;

/** F07 writes: producer/read locks are caller ordered; retention deletes only due personal rows. */
public interface NotificationStore {
  /**
   * Deletes one bounded batch of personal rows across all owners, read and visibility states. Uses
   * a dedicated retention transaction; never deletes facts or installation associations.
   *
   * @param cutoff inclusive original creation cutoff, calculated once for this pass
   * @return affected deletion count and whether selection filled the batch; caller owns commit
   */
  PurgeBatch deleteExpired(Instant cutoff);

  /**
   * Bounded retention progress; a full selection requires another batch even after concurrent
   * removal.
   *
   * @param deleted personal rows removed by this transaction
   * @param more whether the selected batch was full
   */
  record PurgeBatch(int deleted, boolean more) {}

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

  /**
   * Immutable personal allocation for persistence and later ephemeral handoff, without read
   * mutation.
   *
   * @param id personal UUID
   * @param accountId locked original owner
   * @param matchId locked original match
   * @param family fixed family
   * @param variant fixed editorial choice
   * @param createdAt original processing instant in UTC
   */
  record Entry(
      UUID id,
      UUID accountId,
      UUID matchId,
      NotificationFamily family,
      NotificationVariant variant,
      Instant createdAt) {}
}
