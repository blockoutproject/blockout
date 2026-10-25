package com.blockout.backend.notifications.infrastructure;

import com.blockout.backend.notifications.application.InboxReadStore;
import com.blockout.backend.notifications.application.InboxViews.Continuation;
import com.blockout.backend.notifications.application.InboxViews.Summary;
import com.blockout.backend.notifications.application.NotificationContext;
import com.blockout.backend.notifications.domain.NotificationRetention;
import com.blockout.backend.sporting.application.ConsultationMatchSelection;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Root;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.ScrollPosition;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Window;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;

/**
 * Current owner/age/sporting selection before native keyset paging; no application orchestration.
 */
@Repository
@RequiredArgsConstructor
public class JpaInboxReadStore implements InboxReadStore {
  private static final Sort ORDER = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
  private final NotificationRepository notifications;
  private final EntityManager entities;
  private final ConsultationMatchSelection sporting;
  private final NotificationPersistenceMapper mapper;

  /** {@inheritDoc} */
  @Override
  public Selection page(NotificationContext owner, Continuation after, Instant now) {
    ScrollPosition position =
        after == null
            ? ScrollPosition.keyset()
            : ScrollPosition.forward(Map.of("createdAt", after.createdAt(), "id", after.id()));
    Window<NotificationRow> window =
        notifications.findBy(
            current(owner, now),
            q -> q.as(NotificationRow.class).sortBy(ORDER).limit(20).scroll(position));
    List<NotificationRow> rows = window.getContent();
    Continuation next =
        window.hasNext() ? new Continuation(rows.getLast().createdAt(), rows.getLast().id()) : null;
    return new Selection(rows.stream().map(mapper::toSnapshot).toList(), next);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<Snapshot> member(NotificationContext owner, UUID id, Instant now) {
    Specification<NotificationEntity> selected =
        current(owner, now).and((root, query, builder) -> builder.equal(root.get("id"), id));
    return notifications
        .findBy(selected, q -> q.as(NotificationRow.class).one())
        .map(mapper::toSnapshot);
  }

  /** {@inheritDoc} */
  @Override
  public Summary summary(NotificationContext owner, Instant now) {
    // Criteria keeps the aggregate on the exact same composable selection as keyset/member reads.
    CriteriaBuilder builder = entities.getCriteriaBuilder();
    CriteriaQuery<Tuple> query = builder.createTupleQuery();
    Root<NotificationEntity> root = query.from(NotificationEntity.class);
    query.multiselect(
        builder.count(root).alias("count"),
        builder.least(root.<Instant>get("createdAt")).alias("oldest"));
    query.where(
        current(owner, now).toPredicate(root, query, builder), builder.isFalse(root.get("read")));
    Tuple result = entities.createQuery(query).getSingleResult();
    Instant oldest = result.get("oldest", Instant.class);
    return new Summary(
        result.get("count", Long.class),
        oldest == null ? null : oldest.plus(NotificationRetention.RETENTION));
  }

  /** {@inheritDoc} */
  @Override
  public Optional<UUID> matchId(NotificationContext owner, UUID id) {
    return notifications.findMatchId(owner.accountId(), id);
  }

  /**
   * Composes owner, elapsed age and current sporting eligibility before selection.
   *
   * @param owner captured original owner
   * @param now shared evaluation instant
   * @return live row predicates applied before every page/member/count
   */
  private Specification<NotificationEntity> current(NotificationContext owner, Instant now) {
    return (root, query, builder) ->
        builder.and(
            builder.equal(root.get("accountId"), owner.accountId()),
            builder.greaterThan(root.get("createdAt"), now.minus(NotificationRetention.RETENTION)),
            root.get("matchId").in(sporting.visibleIds(query, builder)));
  }
}
