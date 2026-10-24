package com.blockout.backend.notifications.infrastructure;

import com.blockout.backend.notifications.application.NotificationStore;
import com.blockout.backend.notifications.domain.MatchAnnouncementFacts;
import jakarta.persistence.EntityManager;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Insert-only allocations and managed fact updates inside the producer's JPA transaction. */
@Repository
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
@Transactional(propagation = Propagation.MANDATORY)
public class JpaNotificationStore implements NotificationStore {
  private final EntityManager entities;

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
