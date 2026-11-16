package com.blockout.backend.accounts.infrastructure;

import com.blockout.backend.accounts.application.ProfilePhoto;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Focused photo-column mapping; ordinary identity reads and locks never materialize image bytes.
 */
@Entity
@Table(name = "account")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class AccountPhotoEntity {
  @Id private UUID id;

  @Column(name = "photo_bytes")
  private byte[] bytes;

  @Column(name = "photo_media_type")
  private String mediaType;

  /**
   * Reads this lifecycle's complete accepted photo without exporting a managed object.
   *
   * @return accepted original bytes, or null when the photo is absent
   */
  ProfilePhoto photo() {
    return bytes == null ? null : new ProfilePhoto(bytes, mediaType);
  }

  /**
   * Replaces or clears the complete photo association under the original account row lock.
   *
   * @param photo accepted original bytes, or null for explicit removal
   */
  void replace(ProfilePhoto photo) {
    bytes = photo == null ? null : photo.bytes();
    mediaType = photo == null ? null : photo.mediaType();
  }
}
