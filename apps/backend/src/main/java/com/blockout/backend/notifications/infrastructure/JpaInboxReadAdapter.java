package com.blockout.backend.notifications.infrastructure;

import com.blockout.backend.contributions.application.ReadPublicContribution;
import com.blockout.backend.notifications.application.InboxReadStore;
import com.blockout.backend.notifications.application.NotificationContext;
import com.blockout.backend.sporting.application.ConsultationMatchSelection;
import com.blockout.backend.sporting.application.ConsultationViews.MatchSummary;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Root;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.ScrollPosition;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Window;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;

/**
 * Current owner/age/sporting selection before keyset paging, followed by bounded owner hydration.
 */
@Repository
@RequiredArgsConstructor
public class JpaInboxReadAdapter implements InboxReadStore {
  private static final Sort ORDER = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
  private final NotificationRepository notifications;
  private final EntityManager entities;
  private final ConsultationMatchSelection sporting;
  private final ReadPublicContribution contributions;

  /** {@inheritDoc} */
  @Override
  public Page page(NotificationContext owner, Continuation after, Instant now) {
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
    return new Page(hydrate(rows, now), next);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<Entry> member(NotificationContext owner, UUID id, Instant now) {
    Specification<NotificationEntity> selected =
        current(owner, now).and((root, query, builder) -> builder.equal(root.get("id"), id));
    return notifications
        .findBy(selected, q -> q.as(NotificationRow.class).one())
        .map(row -> hydrate(List.of(row), now).getFirst());
  }

  /** {@inheritDoc} */
  @Override
  public Summary summary(NotificationContext owner, Instant now) {
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
        result.get("count", Long.class), oldest == null ? null : oldest.plus(RETENTION));
  }

  /** {@inheritDoc} */
  @Override
  public Optional<UUID> matchId(NotificationContext owner, UUID id) {
    return Optional.ofNullable(
        entities
            .createQuery(
                "SELECT n.matchId FROM NotificationEntity n WHERE n.id=:id AND n.accountId=:owner",
                UUID.class)
            .setParameter("id", id)
            .setParameter("owner", owner.accountId())
            .getSingleResultOrNull());
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
            builder.greaterThan(root.get("createdAt"), now.minus(RETENTION)),
            root.get("matchId").in(sporting.visibleIds(query, builder)));
  }

  /**
   * Hydrates current sporting and link facts in bounded owner queries.
   *
   * @param rows bounded current personal rows
   * @param now shared evaluation instant
   * @return current detached presentation without N+1 sporting/link reads
   */
  private List<Entry> hydrate(List<NotificationRow> rows, Instant now) {
    Set<UUID> ids = rows.stream().map(NotificationRow::matchId).collect(Collectors.toSet());
    Map<UUID, MatchSummary> matches = sporting.summaries(ids, now);
    Set<UUID> links = contributions.availableForConsultableMatches(ids);
    return rows.stream()
        .map(
            row ->
                new Entry(
                    row.id(),
                    row.createdAt(),
                    row.family(),
                    row.variant(),
                    row.read(),
                    matches.get(row.matchId()),
                    links.contains(row.matchId())))
        .toList();
  }
}
