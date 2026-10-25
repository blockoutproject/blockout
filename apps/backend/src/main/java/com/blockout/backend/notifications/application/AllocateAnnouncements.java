package com.blockout.backend.notifications.application;

import com.blockout.backend.following.application.FollowContext.Relation;
import com.blockout.backend.notifications.application.AnnouncementRecipients.Recipient;
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
   * variant. The producer has already consumed its allowance and holds sporting and complete
   * account locks.
   *
   * @param matchId locked original match
   * @param family accepted announcement family
   * @param recipients current audience under retained account locks
   * @param now original processing instant
   * @return new allocations and relation incarnations for transient after-commit handoff
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public List<Created> create(
      UUID matchId, NotificationFamily family, List<Recipient> recipients, Instant now) {
    List<Created> created = new ArrayList<>();
    for (Recipient recipient : recipients) {
      UUID id = UUID.randomUUID();
      Entry entry =
          new Entry(
              id, recipient.accountId(), matchId, family, NotificationVariant.choose(id), now);
      store.create(entry);
      created.add(new Created(entry, recipient.relations()));
    }
    return List.copyOf(created);
  }

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
  public record Entry(
      UUID id,
      UUID accountId,
      UUID matchId,
      NotificationFamily family,
      NotificationVariant variant,
      Instant createdAt) {}

  /**
   * Newly allocated personal entry and original follow incarnations; never a durable send job.
   *
   * @param entry persisted unread personal entry
   * @param relations trigger-time origins for later continuity checks
   */
  public record Created(Entry entry, Set<Relation> relations) {
    /**
     * Detaches the captured audience from mutable selection collections.
     *
     * @param entry newly allocated immutable entry
     * @param relations original current follows
     */
    public Created {
      relations = Set.copyOf(relations);
    }
  }
}
