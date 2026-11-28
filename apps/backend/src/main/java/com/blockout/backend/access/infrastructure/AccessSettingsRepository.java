package com.blockout.backend.access.infrastructure;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** JPA fixed-row access and a complete one-statement snapshot without a global version. */
interface AccessSettingsRepository extends JpaRepository<AccessSettingsEntity, String> {
  /** Returns both fixed rows in one statement snapshot, or empty if either row is missing. */
  @Query(
      "SELECT NEW com.blockout.backend.access.infrastructure.AccessSettingsRows(m.active, m.message, m.imageUrl, v.iosMinimumVersion, v.iosStoreUrl, v.androidMinimumVersion, v.androidStoreUrl, v.message) FROM AccessSettingsEntity m, AccessSettingsEntity v WHERE m.id = 'maintenance' AND v.id = 'versions'")
  Optional<AccessSettingsRows> complete();
}
