package com.blockout.backend.accounts.infrastructure;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Photo reads/dirty checking on an existing account row, coordinated by the account's owner lock.
 */
interface AccountPhotoRepository extends JpaRepository<AccountPhotoEntity, UUID> {}
