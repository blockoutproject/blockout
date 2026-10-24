package com.blockout.backend.contributions.infrastructure;

import com.blockout.backend.contributions.application.ContributionStore;
import com.blockout.backend.contributions.domain.ContributionQuota;
import com.blockout.backend.contributions.domain.ContributionState;
import com.blockout.backend.contributions.domain.ContributionVersion;
import com.blockout.backend.contributions.domain.ContributionVersion.DecisionKind;
import com.blockout.backend.contributions.domain.ContributionVersion.State;
import com.blockout.backend.contributions.domain.StreamAddress;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Repository;

/** JPA contribution persistence; callers own ordered sporting/account locks and transactions. */
@Repository
@RequiredArgsConstructor
public class JpaContributionStore implements ContributionStore {
  private final EntityManager entities;
  private final ContributionVersionRepository versions;
  private final ContributionPersistenceMapper mapper;

  /** {@inheritDoc} */
  @Override
  public ContributionState state(UUID matchId) {
    MatchContributionStateEntity state = entities.find(MatchContributionStateEntity.class, matchId);
    return state == null ? ContributionState.initial(matchId) : mapper.toState(state);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<ContributionVersion> active(UUID matchId) {
    return entities
        .createQuery(
            "SELECT v FROM ContributionVersionEntity v WHERE v.matchId = :match AND v.state = :state",
            ContributionVersionEntity.class)
        .setParameter("match", matchId)
        .setParameter("state", State.ACTIVE)
        .getResultList()
        .stream()
        .findFirst()
        .map(mapper::toVersion);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<ContributionVersion> pending(UUID matchId, UUID ownerId) {
    return entities
        .createQuery(
            "SELECT v FROM ContributionVersionEntity v WHERE v.matchId = :match AND v.ownerId = :owner AND v.state = :state",
            ContributionVersionEntity.class)
        .setParameter("match", matchId)
        .setParameter("owner", ownerId)
        .setParameter("state", State.PENDING)
        .getResultList()
        .stream()
        .findFirst()
        .map(mapper::toVersion);
  }

  /** {@inheritDoc} */
  @Override
  public ContributionQuota.Usage usage(UUID ownerId, UUID matchId, ContributionQuota.Day day) {
    return versions.usage(ownerId, matchId, day);
  }

  /** {@inheritDoc} */
  @Override
  public Set<UUID> attributionAccounts(UUID matchId) {
    List<Tuple> rows =
        entities
            .createQuery(
                "SELECT v.ownerId AS owner, v.publicationActorId AS publicationActor, v.decisionActorId AS decisionActor FROM ContributionVersionEntity v WHERE v.matchId = :match AND v.state IN :states",
                Tuple.class)
            .setParameter("match", matchId)
            .setParameter("states", List.of(State.ACTIVE, State.PENDING))
            .getResultList();
    Set<UUID> accounts = new HashSet<>();
    for (Tuple row : rows) {
      for (String field : List.of("owner", "publicationActor", "decisionActor")) {
        UUID account = row.get(field, UUID.class);
        if (account != null) accounts.add(account);
      }
    }
    return Set.copyOf(accounts);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<ContributionVersion> version(UUID id) {
    return versions.findById(id).map(mapper::toVersion);
  }

  /** {@inheritDoc} */
  @Override
  public VersionPage own(UUID matchId, UUID ownerId, int page) {
    Slice<ContributionVersionEntity> found =
        versions.findByMatchIdAndOwnerIdOrderByCreatedAtDescIdAsc(
            matchId, ownerId, PageRequest.of(page, 20));
    return new VersionPage(
        found.getContent().stream().map(mapper::toVersion).toList(), found.hasNext());
  }

  /** {@inheritDoc} */
  @Override
  public ContributionVersion record(
      UUID matchId,
      UUID ownerId,
      StreamAddress address,
      boolean active,
      boolean moderator,
      Instant now) {
    List<ContributionVersionEntity> current =
        entities
            .createQuery(
                "SELECT v FROM ContributionVersionEntity v WHERE v.matchId = :match AND v.state IN :states",
                ContributionVersionEntity.class)
            .setParameter("match", matchId)
            .setParameter("states", List.of(State.ACTIVE, State.PENDING))
            .getResultList();
    List<ContributionVersionEntity> replaced = new ArrayList<>();
    for (ContributionVersionEntity old : current) {
      if (old.getState() == State.ACTIVE && active) {
        decide(old, State.REPLACED, DecisionKind.REPLACEMENT, ownerId, now);
        replaced.add(old);
      } else if (old.getState() == State.PENDING && (moderator || ownerId.equals(old.getOwnerId())))
        decide(old, State.SUPERSEDED, DecisionKind.SUPERSESSION, ownerId, now);
    }
    // Native insert ordering would otherwise place INSERT before UPDATE against partial uniqueness.
    entities.flush();
    ContributionVersionEntity created =
        new ContributionVersionEntity(
            matchId,
            address,
            ownerId,
            active ? State.ACTIVE : State.PENDING,
            now,
            !moderator,
            null);
    if (active) {
      created.setPublicationKind(DecisionKind.PUBLICATION);
      created.setPublicationAt(now);
      created.setPublicationActorId(ownerId);
    }
    entities.persist(created);
    for (ContributionVersionEntity old : replaced) old.setReplacedByVersionId(created.getId());
    return mapper.toVersion(created);
  }

  /**
   * Applies one useful lifecycle decision without changing immutable creation or quota facts.
   *
   * @param version current managed version under retained match/account locks
   * @param state accepted historical lifecycle
   * @param kind useful decision explaining that lifecycle
   * @param actor original actor already locked by the caller
   * @param now decision instant
   */
  private void decide(
      ContributionVersionEntity version, State state, DecisionKind kind, UUID actor, Instant now) {
    version.setState(state);
    version.setDecisionKind(kind);
    version.setDecisionAt(now);
    version.setDecisionActorId(actor);
  }

  /** {@inheritDoc} */
  @Override
  public ContributionState advance(UUID matchId, boolean clearHold) {
    MatchContributionStateEntity state = entities.find(MatchContributionStateEntity.class, matchId);
    if (state == null) {
      state = new MatchContributionStateEntity(matchId);
      entities.persist(state);
    }
    state.setRevision(state.getRevision() + 1);
    if (clearHold) state.setReportHoldVersionId(null);
    return mapper.toState(state);
  }

  /** {@inheritDoc} */
  @Override
  public List<UUID> activeMatches(UUID afterId) {
    String after = afterId == null ? "" : " AND v.matchId > :after";
    jakarta.persistence.TypedQuery<UUID> query =
        entities
            .createQuery(
                "SELECT v.matchId FROM ContributionVersionEntity v WHERE v.state = :state"
                    + after
                    + " ORDER BY v.matchId",
                UUID.class)
            .setParameter("state", State.ACTIVE)
            .setMaxResults(100);
    if (afterId != null) query.setParameter("after", afterId);
    return query.getResultList();
  }
}
