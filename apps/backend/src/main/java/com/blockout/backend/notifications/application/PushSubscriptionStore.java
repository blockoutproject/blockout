package com.blockout.backend.notifications.application;

import java.util.List;
import java.util.UUID;

/**
 * Persistence boundary for current connection associations; addresses never cross the public read
 * boundary.
 */
public interface PushSubscriptionStore {
  /**
   * Removes this original account's personal data in the caller's erasure transaction. Retained
   * nonpersonal facts and other owners remain unchanged; acquires no domain root.
   *
   * @param accountId original lifecycle protected by its account row lock
   */
  void erase(UUID accountId);

  /** Private immutable trigger-time row incarnation, native revision and project-scoped address. */
  record Target(UUID id, long revision, String address) {}

  /**
   * Captures only existing destinations under the producer's original-account locks.
   *
   * @param accountId original owner
   * @return immutable current targets; later registrations are never added to this event
   */
  List<Target> targets(UUID accountId);

  /**
   * Checks a captured target without authorizing a replacement incarnation or owner.
   *
   * @param accountId original owner
   * @param target captured private row/version/address
   * @return whether all captured values still match
   */
  boolean current(UUID accountId, Target target);

  /**
   * Complete authenticated association intent; installation metadata supplies no account authority.
   */
  record Registration(UUID id, UUID installationId, UUID accountId, String expoPushToken) {}

  /** Detached ownership metadata used for sorted locking and the address-free response. */
  record Association(UUID id, UUID installationId, UUID accountId) {}

  /** Accepted resource state and whether this exact connection identity was newly created. */
  record Replacement(Association association, boolean created) {}

  /**
   * Selects current bindings conflicting by ID, installation or address, in one statement snapshot.
   *
   * @param registration original complete intent
   * @return detached metadata for every currently affected owner
   */
  List<Association> affected(Registration registration);

  /**
   * Replaces the complete binding and removes its conflicts in the caller's locked transaction.
   * Advances the native revision even when the address is unchanged.
   *
   * @param registration original complete intent, with all selected accounts locked
   * @param lockedBindings exact bindings rechecked under those account locks; no later conflict may
   *     be removed
   * @return address-free accepted association
   */
  Replacement replace(Registration registration, List<Association> lockedBindings);

  /**
   * Removes only this exact original-owner connection, succeeding when already absent.
   *
   * @param accountId authenticated original lifecycle
   * @param id exact sign-in association
   */
  void remove(UUID accountId, UUID id);

  /**
   * Invalidates a captured provider target only while ID, native version and address still match.
   *
   * @param id captured native persistence identity, distinct from the public sign-in subscription
   *     ID
   * @param revision captured native JPA version
   * @param address captured private Expo address
   * @return whether that exact target was removed
   */
  boolean invalidate(UUID id, long revision, String address);
}
