package com.blockout.backend.notifications.application;

import com.blockout.backend.notifications.application.InboxViews.Continuation;
import com.blockout.backend.notifications.application.InboxViews.Summary;
import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.notifications.domain.NotificationVariant;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Current personal database selection; application reads own cross-feature hydration and
 * composition.
 */
public interface InboxReadStore {
  /**
   * Reads one current bounded inbox page.
   *
   * @param owner original owner
   * @param after exclusive boundary, or null
   * @param now evaluation instant
   * @return at most twenty current entries
   */
  Selection page(NotificationContext owner, Continuation after, Instant now);

  /**
   * Reads the exact current retained entry.
   *
   * @param owner original owner
   * @param id personal identity
   * @param now evaluation instant
   * @return current retained entry, empty for any unavailable target
   */
  Optional<Snapshot> member(NotificationContext owner, UUID id, Instant now);

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
   * Scalar personal values selected with current owner, age and sporting predicates.
   *
   * @param id original personal identity
   * @param matchId retained sporting identity
   * @param createdAt original ordering and retention origin
   * @param family fixed announcement composition
   * @param variant stable editorial choice
   * @param read persisted monotone read state
   */
  record Snapshot(
      UUID id,
      UUID matchId,
      Instant createdAt,
      NotificationFamily family,
      NotificationVariant variant,
      boolean read) {}

  /**
   * Bounded database selection before application-owned current presentation hydration.
   *
   * @param entries at most twenty authorized personal rows
   * @param next exclusive continuation, or null at exhaustion
   */
  record Selection(List<Snapshot> entries, Continuation next) {
    /**
     * Detaches the selected rows from mutable adapter collections.
     *
     * @param entries current authorized rows
     * @param next original exclusive keys, or null
     */
    public Selection {
      entries = List.copyOf(entries);
    }
  }
}
