package com.blockout.backend.notifications.infrastructure;

import com.blockout.backend.notifications.application.NotificationStore;
import com.blockout.backend.notifications.domain.MatchAnnouncementFacts;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Ordinary JPA writes in the producer transaction; PostgreSQL supplements match/account locks. */
@Repository
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
@Transactional(propagation = Propagation.MANDATORY)
public class JpaNotificationStore implements NotificationStore {
  private final MatchAnnouncementRepository announcements;
  private final NotificationRepository notifications;

  /** {@inheritDoc} */
  @Override
  public MatchAnnouncementFacts facts(UUID matchId) {
    return announcements
        .findById(matchId)
        .map(MatchAnnouncementEntity::facts)
        .orElseGet(() -> MatchAnnouncementFacts.empty(matchId));
  }

  /** {@inheritDoc} */
  @Override
  public void saveFacts(MatchAnnouncementFacts facts) {
    announcements
        .findById(facts.matchId())
        .ifPresentOrElse(
            entity -> entity.advance(facts),
            () -> announcements.save(new MatchAnnouncementEntity(facts)));
  }

  /** {@inheritDoc} */
  @Override
  public void create(Entry entry) {
    notifications.save(new NotificationEntity(entry));
  }
}
