package com.blockout.backend.notifications.application;

import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.notifications.domain.NotificationVariant;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** One allocation rule for result and link announcements inside their producer transaction. */
@Service
@RequiredArgsConstructor
public class AllocateAnnouncements {
  private final NotificationStore store;

  /**
   * Creates one immutable unread entry per selected original account with a stable editorial
   * variant. The producer has already consumed its allowance and holds the necessary sporting and
   * producer account locks. Selected-account integrity uses the existing Inbox foreign keys.
   *
   * @param matchId locked original match
   * @param family accepted announcement family
   * @param recipients accounts selected once for this announcement
   * @param now original processing instant
   * @return new allocations for transient after-commit handoff
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public List<Entry> create(
      UUID matchId, NotificationFamily family, Set<UUID> recipients, Instant now) {
    List<Entry> created = new ArrayList<>();
    for (UUID recipient : recipients) {
      UUID id = UUID.randomUUID();
      Entry entry = new Entry(id, recipient, matchId, family, NotificationVariant.choose(id), now);
      store.create(entry);
      created.add(entry);
    }
    return List.copyOf(created);
  }

  /**
   * Immutable personal allocation for persistence and later ephemeral handoff, without read
   * mutation.
   *
   * @param id personal UUID
   * @param accountId selected original owner
   * @param matchId locked original match
   * @param family fixed family
   * @param variant fixed editorial choice
   * @param createdAt original processing instant in UTC
   */
  public record Entry(
      UUID id,
      UUID accountId,
      UUID matchId,
      NotificationFamily family,
      NotificationVariant variant,
      Instant createdAt) {}
}
