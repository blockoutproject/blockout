package com.blockout.backend.notifications.application;

import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.notifications.domain.NotificationVariant;
import com.blockout.backend.sporting.application.ConsultationViews.MatchSummary;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Current personal selection and detached owner projections in the caller's transaction. */
public interface InboxReadStore {
  /** Consultation ends at this elapsed age, independently of physical cleanup. */
  Duration RETENTION = Duration.ofDays(29);

  /**
   * Reads one current bounded inbox page.
   *
   * @param owner original owner
   * @param after exclusive boundary, or null
   * @param now evaluation instant
   * @return at most twenty current entries
   */
  Page page(NotificationContext owner, Continuation after, Instant now);

  /**
   * Reads the exact current retained entry.
   *
   * @param owner original owner
   * @param id personal identity
   * @param now evaluation instant
   * @return current retained entry, empty for any unavailable target
   */
  Optional<Entry> member(NotificationContext owner, UUID id, Instant now);

  /**
   * Returns the current whole-inbox aggregate.
   *
   * @param owner original owner
   * @param now evaluation instant
   * @return whole-inbox count and earliest counted expiry from one selection
   */
  Summary summary(NotificationContext owner, Instant now);

  /**
   * Resolves only the exact allocation's sporting identity for ordered locking.
   *
   * @param owner original owner
   * @param id exact entry
   * @return sporting root to lock before the owner, without granting access
   */
  Optional<UUID> matchId(NotificationContext owner, UUID id);

  /**
   * Original persisted exclusive sort keys, independent of the continued row's existence.
   *
   * @param createdAt original persisted microsecond-precision creation instant
   * @param id original UUID tie-breaker
   */
  record Continuation(Instant createdAt, UUID id) {}

  /**
   * Detached current presentation with fixed personal allocation and editorial choice.
   *
   * @param id original personal identity
   * @param createdAt original retention and ordering origin
   * @param family fixed announcement composition
   * @param variant stable French editorial choice
   * @param read confirmed monotone read state
   * @param match currently permitted F03 match summary
   * @param publicLink current F08 active-link presence, without a video address
   */
  record Entry(
      UUID id,
      Instant createdAt,
      NotificationFamily family,
      NotificationVariant variant,
      boolean read,
      MatchSummary match,
      boolean publicLink) {}

  /**
   * Bounded selection with no count or cross-request snapshot.
   *
   * @param entries current authorized entries
   * @param next exclusive continuation, or null at exhaustion
   */
  record Page(List<Entry> entries, Continuation next) {
    /**
     * Detaches the bounded selection from its persistence context.
     *
     * @param entries current authorized entries
     * @param next exclusive keys, or null
     */
    public Page {
      entries = List.copyOf(entries);
    }
  }

  /**
   * Count across all pages with its next age-driven invalidation point.
   *
   * @param unreadCount all currently consultable unread entries
   * @param nextExpiryAt earliest counted expiry, absent exactly at zero
   */
  record Summary(long unreadCount, Instant nextExpiryAt) {}
}
