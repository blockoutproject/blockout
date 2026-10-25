package com.blockout.backend.accounts.infrastructure;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Photo reads/dirty checking on an existing account row, coordinated by the account's owner lock.
 */
interface AccountPhotoRepository extends JpaRepository<AccountPhotoEntity, UUID> {
  /**
   * Checks accepted-photo presence with a bounded identity projection, without loading pixels.
   *
   * @param id original lifecycle UUID
   * @return true only when this existing account has accepted bytes
   */
  boolean existsByIdAndBytesIsNotNull(UUID id);
}
