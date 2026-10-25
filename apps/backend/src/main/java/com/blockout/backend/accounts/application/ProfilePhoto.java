package com.blockout.backend.accounts.application;

import com.blockout.backend.accounts.application.exception.InvalidProfileChangeException;
import com.blockout.backend.generated.mobile.model.ProfilePhotoActionEnum;

/**
 * Accepted, metadata-free square pixels for the local account transaction.
 *
 * @param bytes reencoded image, at most 5 MiB
 * @param mediaType detected PNG/JPEG media type
 * @param dimension square side between 1 and 1024 pixels
 */
public record ProfilePhoto(byte[] bytes, String mediaType, int dimension) {
  /**
   * Requires an image exactly for replacement, both before decoding and before a prepared save.
   *
   * @param action explicit photo intent, or null to preserve the existing photo
   * @param supplied whether a multipart image or its prepared pixels are present
   * @throws InvalidProfileChangeException when the image and intent disagree
   */
  public static void requireConsistentIntent(ProfilePhotoActionEnum action, boolean supplied) {
    if ((action == ProfilePhotoActionEnum.REPLACE) != supplied)
      throw new InvalidProfileChangeException();
  }
}
