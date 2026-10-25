package com.blockout.backend.contributions.infrastructure;

import com.blockout.backend.contributions.application.ContributionStore;
import com.blockout.backend.contributions.domain.ContributionQuota;
import com.blockout.backend.contributions.domain.ContributionState;
import com.blockout.backend.contributions.domain.ContributionVersion;
import com.blockout.backend.contributions.domain.ContributionVersion.DecisionKind;
import com.blockout.backend.contributions.domain.ContributionVersion.State;
import com.blockout.backend.contributions.domain.StreamAddress;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Limit;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** JPA contribution persistence; callers own ordered sporting/account locks and transactions. */
@Repository
@RequiredArgsConstructor
public class JpaContributionStore implements ContributionStore {
  private final EntityManager entities;
  private final ContributionVersionRepository versions;
  private final ContributionPersistenceMapper mapper;

  /** {@inheritDoc} */
  @Override
  public Set<UUID> activeMatchIds(Set<UUID> matchIds) {
    if (matchIds.isEmpty()) return Set.of();
    return Set.copyOf(versions.findMatchIdsByMatchIdInAndState(matchIds, State.ACTIVE));
  }

  /** {@inheritDoc} */
  @Override
  public ContributionState state(UUID matchId) {
    MatchContributionStateEntity state = entities.find(MatchContributionStateEntity.class, matchId);
    return state == null ? ContributionState.initial(matchId) : mapper.toState(state);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<ContributionVersion> active(UUID matchId) {
    return versions.findByMatchIdAndState(matchId, State.ACTIVE).map(mapper::toVersion);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<ContributionVersion> pending(UUID matchId, UUID ownerId) {
    return versions
        .findByMatchIdAndOwnerIdAndState(matchId, ownerId, State.PENDING)
        .map(mapper::toVersion);
  }

  /** {@inheritDoc} */
  @Override
  public ContributionQuota.Usage usage(UUID ownerId, UUID matchId, ContributionQuota.Day day) {
    return versions.usage(ownerId, matchId, day.startsAt(), day.endsAt());
  }

  /** {@inheritDoc} */
  @Override
  public Set<UUID> attributionAccounts(UUID matchId) {
    Set<UUID> accounts = new HashSet<>();
    for (ContributionVersionRepository.Attribution row :
        versions.findAttributions(matchId, List.of(State.ACTIVE, State.PENDING))) {
      if (row.getOwnerId() != null) accounts.add(row.getOwnerId());
      if (row.getPublicationActorId() != null) accounts.add(row.getPublicationActorId());
      if (row.getDecisionActorId() != null) accounts.add(row.getDecisionActorId());
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
  @Transactional(propagation = Propagation.MANDATORY)
  public ContributionVersion record(
      UUID matchId,
      UUID ownerId,
      StreamAddress address,
      boolean active,
      boolean moderator,
      Instant now) {
    List<ContributionVersionEntity> current =
        versions.findByMatchIdAndStateIn(matchId, List.of(State.ACTIVE, State.PENDING));
    List<ContributionVersionEntity> replaced = new ArrayList<>();
    for (ContributionVersionEntity old : current) {
      if (old.getState() == State.ACTIVE && active) {
        decide(old, State.REPLACED, DecisionKind.REPLACEMENT, ownerId, now);
        replaced.add(old);
      } else if (old.getState() == State.PENDING && (moderator || ownerId.equals(old.getOwnerId())))
        decide(old, State.SUPERSEDED, DecisionKind.SUPERSESSION, ownerId, now);
    }
    // Native insert ordering would otherwise place INSERT before UPDATE against partial uniqueness.
    versions.flush();
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
    versions.save(created);
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
  @Transactional(propagation = Propagation.MANDATORY)
  public ContributionState advance(UUID matchId, boolean clearHold) {
    MatchContributionStateEntity state = entities.find(MatchContributionStateEntity.class, matchId);
    if (state == null) {
      state = new MatchContributionStateEntity(matchId);
      // The match supplies this ID: persist must reject a duplicate, never merge an old revision.
      entities.persist(state);
    }
    state.setRevision(state.getRevision() + 1);
    if (clearHold) state.setReportHoldVersionId(null);
    return mapper.toState(state);
  }

  /** {@inheritDoc} */
  @Override
  public List<UUID> activeMatches(UUID afterId) {
    return versions.findMatchIdsAfter(State.ACTIVE, afterId, Limit.of(100));
  }
}
