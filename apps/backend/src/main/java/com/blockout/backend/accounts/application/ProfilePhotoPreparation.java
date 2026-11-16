package com.blockout.backend.accounts.application;

import com.blockout.backend.accounts.application.exception.InvalidProfilePhotoException;
import com.blockout.backend.accounts.application.exception.ProfilePhotoTooLargeException;
import com.blockout.backend.accounts.application.exception.UnsupportedProfilePhotoException;

/** Validates original profile image bytes before the short account write transaction. */
public interface ProfilePhotoPreparation {
  /**
   * Validates PNG/JPEG content without cropping, resizing or re-encoding the original bytes.
   *
   * @param bytes compressed image part, at most 5 MiB
   * @param mediaType declared PNG/JPEG media type, checked against detected content
   * @return unchanged original bytes with their actual media type
   * @throws InvalidProfilePhotoException for unreadable or spoofed content
   * @throws ProfilePhotoTooLargeException for excessive input bytes
   * @throws UnsupportedProfilePhotoException for an unsupported media declaration
   */
  ProfilePhoto prepare(byte[] bytes, String mediaType);
}
