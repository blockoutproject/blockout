package com.blockout.backend.notifications.infrastructure;

import com.blockout.backend.notifications.application.AllocateAnnouncements.Entry;
import com.blockout.backend.notifications.application.NotificationContext;
import com.blockout.backend.notifications.application.NotificationStore;
import com.blockout.backend.notifications.domain.MatchAnnouncementFacts;
import com.blockout.backend.notifications.domain.NotificationRetention;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Personal allocations, monotone reads and consumed facts inside the caller's JPA transaction. */
@Repository
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
@Transactional(propagation = Propagation.MANDATORY)
public class JpaNotificationStore implements NotificationStore {
  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public void erase(UUID accountId) {
    notifications.erase(accountId);
  }

  private final EntityManager entities;
  private final NotificationRepository notifications;
  private final NotificationPersistenceMapper mapper;

  /** {@inheritDoc} */
  @Override
  public int deleteExpired(Instant cutoff) {
    return notifications.deleteExpired(cutoff);
  }

  /** {@inheritDoc} */
  @Override
  public boolean markRead(NotificationContext owner, UUID id, Instant now) {
    return notifications.markRead(owner.accountId(), id, now.minus(NotificationRetention.RETENTION))
        == 1;
  }

  /** {@inheritDoc} */
  @Override
  public MatchAnnouncementFacts facts(UUID matchId) {
    MatchAnnouncementEntity entity = entities.find(MatchAnnouncementEntity.class, matchId);
    return entity == null ? MatchAnnouncementFacts.empty(matchId) : mapper.toDomain(entity);
  }

  /** {@inheritDoc} */
  @Override
  public void saveFacts(MatchAnnouncementFacts facts) {
    MatchAnnouncementEntity entity = entities.find(MatchAnnouncementEntity.class, facts.matchId());
    // Assigned match IDs are insert-only; merging could replace already consumed allowances.
    if (entity == null) entities.persist(new MatchAnnouncementEntity(facts));
    else entity.advance(facts);
  }

  /** {@inheritDoc} */
  @Override
  public void create(Entry entry) {
    // Allocations have caller-assigned IDs: a duplicate must fail, never merge immutable facts.
    entities.persist(new NotificationEntity(entry));
  }
}
