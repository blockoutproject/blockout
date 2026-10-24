package com.blockout.backend.accounts.application;

import com.blockout.backend.accounts.application.exception.UsernameUnavailableException;
import com.blockout.backend.accounts.domain.Account;
import com.blockout.backend.generated.mobile.model.ProfilePhotoActionEnum;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Account-owned persistence operations; mutations and locks participate in the caller's
 * transaction.
 */
public interface AccountStore {
  /**
   * Resolves only the lifecycle identity without loading profile state before a later row lock.
   *
   * @param issuer exact validated issuer
   * @param subject exact validated subject
   * @return the currently established business UUID, if any
   */
  Optional<UUID> findIdByPrincipal(String issuer, String subject);

  /**
   * Reads the current mapping without creating an account or consulting a provider.
   *
   * @param issuer exact validated issuer
   * @param subject exact validated subject
   * @return the current account, if established
   */
  Optional<Account> findByPrincipal(String issuer, String subject);

  /**
   * Reads an original lifecycle without resolving a later replacement through its principal.
   *
   * @param id original business UUID
   * @return the original account, or empty after erasure
   */
  Optional<Account> findById(UUID id);

  /**
   * Reads accepted-photo presence without loading its private bytes.
   *
   * @param id original business UUID
   * @return whether that lifecycle currently has a photo
   */
  boolean hasPhoto(UUID id);

  /**
   * Loads only the original account's accepted pixels; callers authorize the owner first.
   *
   * @param id original lifecycle UUID
   * @return accepted photo, or empty when absent
   */
  Optional<ProfilePhoto> photo(UUID id);

  /**
   * Applies supplied profile fields to an already locked original row and flushes uniqueness.
   * Omitted values preserve the locked current state; replacement/removal update all photo columns.
   *
   * @param id original UUID locked by the caller
   * @param username normalized supplied username, or null to preserve
   * @param photoAction supplied canonical photo intent, or null to preserve
   * @param photo prepared replacement pixels, otherwise null
   * @throws UsernameUnavailableException when another account holds the supplied username
   */
  void changeProfile(
      UUID id, String username, ProfilePhotoActionEnum photoAction, ProfilePhoto photo);

  /**
   * Locks the original account until the caller's transaction completes. Acquire any domain root
   * locks first; acquire multiple account locks in UUID order.
   *
   * @param id original business UUID
   * @return the locked account, or empty after erasure
   */
  Optional<Account> lockById(UUID id);

  /**
   * Inserts a new lifecycle. PostgreSQL enforces principal and case-insensitive username
   * uniqueness; the caller handles a rejected competing creation after its transaction rolls back.
   *
   * @param issuer exact validated issuer
   * @param subject exact validated subject
   * @param username neutral candidate, trimmed before native validation
   * @param email usable required provider email
   * @param principalCreatedAt trustworthy provider creation instant, or null
   * @return the new account with its generated business UUID
   */
  Account create(
      String issuer, String subject, String username, String email, Instant principalCreatedAt);

  /**
   * Locks and synchronizes only the captured lifecycle. Absence never becomes creation or an update
   * to a replacement. Provider retrieval must have completed before the caller's transaction.
   *
   * @param id captured original business UUID
   * @param email usable provider email, or null/blank when unavailable
   * @param principalCreatedAt trustworthy provider instant, or null when unavailable
   * @return updated account, or empty if the original lifecycle was erased
   */
  Optional<Account> synchronize(UUID id, String email, Instant principalCreatedAt);
}
