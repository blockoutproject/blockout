package com.blockout.backend.notifications.infrastructure;

import com.blockout.backend.notifications.application.PushSubscriptionStore.Association;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

/** Scalar current-owner selection and exact bulk operations; no provider call or cross-owner entity access. */
interface PushSubscriptionRepository extends JpaRepository<PushSubscriptionEntity, UUID> {
  /**
   * Reads the complete affected-owner set in one statement without hydrating private managed state.
   * @param id addressed connection
   * @param installationId installation being registered
   * @param address complete new address
   * @return current affected ownership metadata
   */
  @Query("SELECT NEW com.blockout.backend.notifications.application.PushSubscriptionStore$Association(p.id,p.installationId,p.accountId) FROM PushSubscriptionEntity p WHERE p.id=:id OR p.installationId=:installationId OR p.expoPushToken=:address")
  List<Association> affected(UUID id, UUID installationId, String address);

  /**
   * Removes competing identities after sorted owner locking and before native insertion/update.
   * @param id retained/new connection identity
   * @param installationId desired installation
   * @param address desired private destination
   * @return number of removed competing bindings
   */
  @Modifying
  @Query("DELETE FROM PushSubscriptionEntity p WHERE p.id<>:id AND (p.installationId=:installationId OR p.expoPushToken=:address)")
  int removeConflicts(UUID id, UUID installationId, String address);

  /**
   * Removes an exact owner/connection pair, without changing a replacement or returning an address.
   * @param accountId original owner
   * @param id exact connection identity
   */
  @Modifying
  @Query("DELETE FROM PushSubscriptionEntity p WHERE p.accountId=:accountId AND p.id=:id")
  void removeExact(UUID accountId, UUID id);

  /**
   * Conditionally invalidates the exact provider target, bypassing no newer JPA revision.
   * @param id captured identity
   * @param revision captured native version
   * @param address captured private address
   * @return number of exact matching bindings removed
   */
  @Modifying
  @Query("DELETE FROM PushSubscriptionEntity p WHERE p.id=:id AND p.revision=:revision AND p.expoPushToken=:address")
  int invalidate(UUID id, long revision, String address);
}
