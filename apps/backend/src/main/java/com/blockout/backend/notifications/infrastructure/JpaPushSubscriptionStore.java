package com.blockout.backend.notifications.infrastructure;

import com.blockout.backend.notifications.application.PushSubscriptionConflictException;
import com.blockout.backend.notifications.application.PushSubscriptionStore;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * JPA association writes under application-owned account locks, with native uniqueness and
 * versioning.
 */
@Repository
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
@Transactional(propagation = Propagation.MANDATORY)
public class JpaPushSubscriptionStore implements PushSubscriptionStore {
  private final PushSubscriptionRepository subscriptions;
  private final PushSubscriptionPersistenceMapper mapper;
  private final EntityManager entities;

  /** {@inheritDoc} */
  @Override
  public List<Target> targets(UUID accountId) {
    return List.copyOf(subscriptions.targets(accountId));
  }

  /** {@inheritDoc} */
  @Override
  public boolean current(UUID accountId, Target target) {
    return subscriptions.existsByAccountIdAndIdAndRevisionAndExpoPushToken(
        accountId, target.id(), target.revision(), target.address());
  }

  /** {@inheritDoc} */
  @Override
  public List<Association> affected(Registration registration) {
    return List.copyOf(
        subscriptions.affected(
            registration.id(), registration.installationId(), registration.expoPushToken()));
  }

  /** {@inheritDoc} */
  @Override
  public Replacement replace(Registration registration, List<Association> lockedBindings) {
    PushSubscriptionEntity entity =
        subscriptions.findBySubscriptionId(registration.id()).orElse(null);
    if (entity != null && !entity.getAccountId().equals(registration.accountId()))
      throw new PushSubscriptionConflictException();
    for (Association binding : lockedBindings) {
      if (!binding.id().equals(registration.id()))
        subscriptions.removeExact(binding.accountId(), binding.id());
    }
    boolean created = entity == null;
    if (created) {
      entity =
          new PushSubscriptionEntity(
              registration.id(),
              registration.installationId(),
              registration.accountId(),
              registration.expoPushToken());
      entities.persist(entity);
    } else {
      mapper.update(registration, entity);
      // JPA dirty checking alone would not advance an unchanged-address registration.
      entities.lock(entity, LockModeType.OPTIMISTIC_FORCE_INCREMENT);
    }
    entities.flush();
    return new Replacement(mapper.toView(entity), created);
  }

  /** {@inheritDoc} */
  @Override
  public void remove(UUID accountId, UUID id) {
    subscriptions.removeExact(accountId, id);
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public boolean invalidate(UUID id, long revision, String address) {
    return subscriptions.invalidate(id, revision, address) != 0;
  }
}
