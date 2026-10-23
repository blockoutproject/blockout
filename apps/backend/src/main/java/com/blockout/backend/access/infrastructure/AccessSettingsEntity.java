package com.blockout.backend.access.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Two fixed identities each carry their own JPA-managed optimistic version. */
@Entity
@Table(name = "access_settings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class AccessSettingsEntity {
  @Id
  @Column(nullable = false)
  private String id;

  @Version
  @Column(nullable = false)
  private long revision;

  private Boolean active;

  @Column(columnDefinition = "text")
  private String message;

  @Column(name = "image_url", columnDefinition = "text")
  private String imageUrl;

  @Column(name = "ios_minimum_version", columnDefinition = "text")
  private String iosMinimumVersion;

  @Column(name = "ios_store_url", columnDefinition = "text")
  private String iosStoreUrl;

  @Column(name = "android_minimum_version", columnDefinition = "text")
  private String androidMinimumVersion;

  @Column(name = "android_store_url", columnDefinition = "text")
  private String androidStoreUrl;

  /**
   * Updates only maintenance's complete content and activation; the version remains JPA-owned.
   *
   * @param value valid complete maintenance result
   */
  void maintenance(com.blockout.backend.access.domain.MaintenanceSettings value) {
    active = value.active();
    message = value.message();
    imageUrl = value.imageUrl();
  }

  /**
   * Updates only version settings; maintenance and managed revision remain untouched.
   *
   * @param value valid complete versions result
   */
  void versions(com.blockout.backend.access.domain.ApplicationVersionSettings value) {
    message = value.message();
    iosMinimumVersion = value.ios().minimumVersion();
    iosStoreUrl = value.ios().storeUrl();
    androidMinimumVersion = value.android().minimumVersion();
    androidStoreUrl = value.android().storeUrl();
  }
}
