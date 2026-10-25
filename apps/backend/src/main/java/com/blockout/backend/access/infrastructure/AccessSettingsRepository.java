package com.blockout.backend.access.infrastructure;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

/** JPA fixed-row access and a complete one-statement snapshot without a global version. */
interface AccessSettingsRepository extends JpaRepository<AccessSettingsEntity, String> {
  /**
   * Keeps an optimistic commit-time check even when a submitted command is a no-op.
   *
   * @param id exact fixed aggregate identity
   * @return the managed row if present
   */
  @Lock(LockModeType.OPTIMISTIC)
  @Query("SELECT s FROM AccessSettingsEntity s WHERE s.id = :id")
  Optional<AccessSettingsEntity> findByIdForUpdate(String id);

  /** Returns both fixed rows in one statement snapshot, or empty if either row is missing. */
  @Query(
      "SELECT NEW com.blockout.backend.access.infrastructure.AccessSettingsRows(m.revision, m.active, m.message, m.imageUrl, v.revision, v.iosMinimumVersion, v.iosStoreUrl, v.androidMinimumVersion, v.androidStoreUrl, v.message) FROM AccessSettingsEntity m, AccessSettingsEntity v WHERE m.id = 'maintenance' AND v.id = 'versions'")
  Optional<AccessSettingsRows> complete();
}
