package com.blockout.backend.notifications.application;

import com.blockout.backend.notifications.domain.MatchAnnouncementFacts;
import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.notifications.domain.NotificationVariant;
import java.time.Instant;
import java.util.UUID;

/** Required F07 persistence in the producer transaction, after all sporting roots then accounts. */
public interface NotificationStore {
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
