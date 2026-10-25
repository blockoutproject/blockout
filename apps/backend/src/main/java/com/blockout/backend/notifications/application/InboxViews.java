package com.blockout.backend.notifications.application;

import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.notifications.domain.NotificationVariant;
import com.blockout.backend.sporting.application.ConsultationViews.MatchSummary;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Detached current inbox representations, independent from persistence selection and HTTP
 * transport.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class InboxViews {
  /**
   * Original persisted exclusive sort keys, independent of the continued row's existence.
   *
   * @param createdAt original persisted microsecond-precision creation instant
   * @param id original UUID tie-breaker
   */
  public record Continuation(Instant createdAt, UUID id) {}

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
  public record Entry(
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
  public record Page(List<Entry> entries, Continuation next) {
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
  public record Summary(long unreadCount, Instant nextExpiryAt) {}
}
