package com.blockout.backend.accounts.application;

import com.blockout.backend.accounts.application.exception.InvalidProfilePhotoException;
import com.blockout.backend.accounts.application.exception.ProfilePhotoTooLargeException;
import com.blockout.backend.accounts.application.exception.UnsupportedProfilePhotoException;

/** Produces accepted, metadata-free profile pixels before the short account write transaction. */
public interface ProfilePhotoPreparation {
  /**
   * Decodes bounded square PNG/JPEG and reencodes pixels without original metadata.
   *
   * @param bytes compressed image part, at most 5 MiB
   * @param mediaType declared PNG/JPEG media type, checked against detected content
   * @return accepted pixels with their actual media type and square dimension
   * @throws InvalidProfilePhotoException for unreadable, spoofed or out-of-bounds pixels
   * @throws ProfilePhotoTooLargeException for excessive input or output bytes
   * @throws UnsupportedProfilePhotoException for an unsupported media declaration
   */
  ProfilePhoto prepare(byte[] bytes, String mediaType);
}
