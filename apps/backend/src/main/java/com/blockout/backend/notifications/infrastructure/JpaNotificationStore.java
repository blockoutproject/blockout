package com.blockout.backend.notifications.infrastructure;

import com.blockout.backend.contributions.application.ContributionStore;
import com.blockout.backend.notifications.application.AllocateAnnouncements.Entry;
import com.blockout.backend.notifications.application.NotificationContext;
import com.blockout.backend.notifications.application.NotificationStore;
import com.blockout.backend.notifications.domain.MatchAnnouncementFacts;
import com.blockout.backend.notifications.domain.NotificationRetention;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** JPA persistence for announcement facts, personal allocations and live candidates. */
@Repository
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
@Transactional(propagation = Propagation.MANDATORY)
public class JpaNotificationStore implements NotificationStore {
  private final EntityManager entities;
  private final ContributionStore contributions;
  private final NotificationRepository notifications;
  private final NotificationPersistenceMapper mapper;

  /** {@inheritDoc} */
  @Override
  @Transactional(readOnly = true)
  public List<UUID> liveLinkCandidates(UUID afterId, int limit) {
    return contributions.activeMatches(
        afterId,
        limit,
        (query, builder, matchId) -> {
          Subquery<UUID> consumed = query.subquery(UUID.class);
          Root<MatchAnnouncementEntity> facts = consumed.from(MatchAnnouncementEntity.class);
          consumed
              .select(facts.get("matchId"))
              .where(
                  builder.equal(facts.get("matchId"), matchId),
                  builder.isTrue(facts.get("liveProcessed")));
          return builder.not(builder.exists(consumed));
        });
  }

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
    if (entity == null) {
      entities.persist(new MatchAnnouncementEntity(facts));
    } else {
      entity.advance(facts);
    }
  }

  /** {@inheritDoc} */
  @Override
  public void create(Entry entry) {
    // Allocations have caller-assigned IDs: a duplicate must fail, never merge immutable facts.
    entities.persist(new NotificationEntity(entry));
  }
}
