package com.blockout.backend.accounts.application;

import com.blockout.backend.accounts.application.exception.InvalidProfilePhotoException;
import com.blockout.backend.accounts.application.exception.ProfilePhotoTooLargeException;
import com.blockout.backend.accounts.application.exception.UnsupportedProfilePhotoException;

/** Recognizes original profile image headers before the short account write transaction. */
public interface ProfilePhotoPreparation {
  /**
   * Recognizes PNG/JPEG format and dimensions without allocating a raster or changing original
   * bytes. Header recognition does not establish full pixel validity.
   *
   * @param bytes compressed image part, at most 5 MiB
   * @param mediaType declared PNG/JPEG media type, checked against detected content
   * @return unchanged original bytes with their actual media type
   * @throws InvalidProfilePhotoException for an unreadable header or a mismatched declared format
   * @throws ProfilePhotoTooLargeException for excessive input bytes
   * @throws UnsupportedProfilePhotoException for an unsupported media declaration
   */
  ProfilePhoto prepare(byte[] bytes, String mediaType);
}
