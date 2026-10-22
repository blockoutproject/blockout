package com.blockout.backend.accounts.infrastructure;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

/** Native Spring Data queries for exact account identities and original-row locking. */
interface AccountRepository extends JpaRepository<AccountEntity, UUID> {
  /**
   * Finds only the exact provider principal, never an email-derived identity.
   *
   * @param issuer exact validated issuer
   * @param subject exact validated subject
   * @return currently established account
   */
  Optional<AccountEntity> findByIssuerAndSubject(String issuer, String subject);

  /**
   * Checks photo presence without returning its contents.
   *
   * @param id original lifecycle UUID
   * @return true only when the existing account has accepted bytes
   */
  @Query("SELECT COUNT(a) > 0 FROM AccountEntity a WHERE a.id = :id AND a.photoBytes IS NOT NULL")
  boolean hasPhoto(UUID id);

  /**
   * Acquires the original row's write lock in the active transaction.
   *
   * @param id original business UUID
   * @return locked original row, or empty after erasure
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT a FROM AccountEntity a WHERE a.id = :id")
  Optional<AccountEntity> lockById(UUID id);
}
