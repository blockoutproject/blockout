package com.blockout.backend.notifications.application;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Association;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Registration;
import com.blockout.backend.notifications.application.PushSubscriptionStore.Replacement;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** One transactional command family for complete registration and exact local disassociation. */
@Service
@RequiredArgsConstructor
public class ChangePushSubscriptions {
  private final AccountAccess accounts;
  private final PushSubscriptionStore subscriptions;

  /**
   * Locks all affected current accounts in UUID order, then rechecks the original target before writing.
   * A newly affected owner aborts instead of acquiring an earlier lock or replaying the registration.
   * @param registration complete original-owner connection intent
   * @return created/replaced address-free association
   * @throws NotificationNotFoundException for a missing owner or foreign exact connection identity
   * @throws PushSubscriptionConflictException when concurrent changes require a new normal registration occasion
   */
  @Transactional
  public Replacement replace(Registration registration) {
    Set<UUID> affected = new HashSet<>();
    affected.add(registration.accountId());
    subscriptions.affected(registration).forEach(row -> affected.add(row.accountId()));
    boolean originalPresent = false;
    for (UUID accountId : affected.stream().sorted().toList()) {
      boolean present = accounts.lock(accountId);
      if (accountId.equals(registration.accountId())) originalPresent = present;
    }
    if (!originalPresent) throw new NotificationNotFoundException();
    List<Association> current = subscriptions.affected(registration);
    if (current.stream().anyMatch(row -> !affected.contains(row.accountId())))
      throw new PushSubscriptionConflictException();
    if (current.stream().anyMatch(row -> row.id().equals(registration.id()) && !row.accountId().equals(registration.accountId())))
      throw new NotificationNotFoundException();
    return subscriptions.replace(registration);
  }

  /**
   * Deletes only the addressed owner's exact association; another sign-in ID and other devices survive.
   * @param owner authenticated original owner
   * @param id exact connection identity, never an installation or provider address
   * @throws NotificationNotFoundException if the original owner no longer exists
   */
  @Transactional
  public void remove(NotificationContext owner, UUID id) {
    if (!accounts.lock(owner.accountId())) throw new NotificationNotFoundException();
    subscriptions.remove(owner.accountId(), id);
  }
}
