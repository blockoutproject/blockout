package com.blockout.backend.notifications.infrastructure;

import com.blockout.backend.notifications.application.InboxReadStore;
import com.blockout.backend.notifications.application.NotificationContext;
import com.blockout.backend.notifications.application.NotificationStore;
import com.blockout.backend.notifications.domain.MatchAnnouncementFacts;
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
  private final EntityManager entities;

  /** {@inheritDoc} */
  @Override
  public boolean markRead(NotificationContext owner, UUID id, Instant now) {
    return entities
            .createQuery(
                "UPDATE NotificationEntity n SET n.read=TRUE WHERE n.id=:id AND n.accountId=:owner AND n.createdAt>:cutoff")
            .setParameter("id", id)
            .setParameter("owner", owner.accountId())
            .setParameter("cutoff", now.minus(InboxReadStore.RETENTION))
            .executeUpdate()
        == 1;
  }

  /** {@inheritDoc} */
  @Override
  public MatchAnnouncementFacts facts(UUID matchId) {
    MatchAnnouncementEntity entity = entities.find(MatchAnnouncementEntity.class, matchId);
    return entity == null ? MatchAnnouncementFacts.empty(matchId) : entity.facts();
  }

  /** {@inheritDoc} */
  @Override
  public void saveFacts(MatchAnnouncementFacts facts) {
    MatchAnnouncementEntity entity = entities.find(MatchAnnouncementEntity.class, facts.matchId());
    if (entity == null) entities.persist(new MatchAnnouncementEntity(facts));
    else entity.advance(facts);
  }

  /** {@inheritDoc} */
  @Override
  public void create(Entry entry) {
    entities.persist(new NotificationEntity(entry));
  }
}
