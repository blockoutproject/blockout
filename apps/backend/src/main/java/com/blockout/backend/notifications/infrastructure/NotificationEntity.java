package com.blockout.backend.notifications.infrastructure;

import com.blockout.backend.notifications.application.AllocateAnnouncements.Entry;
import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.notifications.domain.NotificationVariant;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Immutable personal allocation with one monotone read bit; sporting presentation stays derived.
 */
@Entity
@Table(name = "notification")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NotificationEntity {
  @Id private UUID id;

  @Column(nullable = false, updatable = false)
  private UUID accountId;

  @Column(nullable = false, updatable = false)
  private UUID matchId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, updatable = false)
  private NotificationFamily family;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, updatable = false)
  private NotificationVariant variant;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "is_read", nullable = false)
  private boolean read;

  /**
   * Creates an unread entry after current owner/follow rechecks under the account lock.
   *
   * @param entry complete immutable personal allocation
   */
  NotificationEntity(Entry entry) {
    id = Objects.requireNonNull(entry.id());
    accountId = Objects.requireNonNull(entry.accountId());
    matchId = Objects.requireNonNull(entry.matchId());
    family = Objects.requireNonNull(entry.family());
    variant = Objects.requireNonNull(entry.variant());
    createdAt = Objects.requireNonNull(entry.createdAt());
  }

  /** Marks the retained entry read; repeated calls preserve true and every immutable field. */
  public void markRead() {
    read = true;
  }
}
