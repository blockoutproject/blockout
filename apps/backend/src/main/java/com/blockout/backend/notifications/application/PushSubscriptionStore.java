package com.blockout.backend.notifications.application;

import java.util.List;
import java.util.UUID;

/** Persistence boundary for current connection associations; addresses never cross the public read boundary. */
public interface PushSubscriptionStore {
  /** Complete authenticated association intent; installation metadata supplies no account authority. */
  record Registration(UUID id, UUID installationId, UUID accountId, String expoPushToken) {}

  /** Detached ownership metadata used for sorted locking and the address-free response. */
  record Association(UUID id, UUID installationId, UUID accountId) {}

  /** Accepted resource state and whether this exact connection identity was newly created. */
  record Replacement(Association association, boolean created) {}

  /**
   * Selects current bindings conflicting by ID, installation or address, in one statement snapshot.
   * @param registration original complete intent
   * @return detached metadata for every currently affected owner
   */
  List<Association> affected(Registration registration);

  /**
   * Replaces the complete binding and removes its conflicts in the caller's locked transaction.
   * Advances the native revision even when the address is unchanged.
   * @param registration original complete intent, with all current affected accounts locked
   * @return address-free accepted association
   */
  Replacement replace(Registration registration);

  /**
   * Removes only this exact original-owner connection, succeeding when already absent.
   * @param accountId authenticated original lifecycle
   * @param id exact sign-in association
   */
  void remove(UUID accountId, UUID id);

  /**
   * Invalidates a captured provider target only while ID, native version and address still match.
   * @param id captured association
   * @param revision captured native JPA version
   * @param address captured private Expo address
   * @return whether that exact target was removed
   */
  boolean invalidate(UUID id, long revision, String address);
}
