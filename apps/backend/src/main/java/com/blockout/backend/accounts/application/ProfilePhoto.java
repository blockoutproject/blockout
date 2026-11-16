package com.blockout.backend.accounts.application;

import com.blockout.backend.accounts.application.exception.InvalidProfileChangeException;
import com.blockout.backend.generated.mobile.model.ProfilePhotoActionEnum;

/**
 * Accepted original image bytes for the local account transaction.
 *
 * @param bytes original image, at most 5 MiB
 * @param mediaType detected PNG/JPEG media type
 */
public record ProfilePhoto(byte[] bytes, String mediaType) {
  /**
   * Requires an image exactly for replacement, both before decoding and before a prepared save.
   *
   * @param action explicit photo intent, or null to preserve the existing photo
   * @param supplied whether a multipart image or validated image bytes are present
   * @throws InvalidProfileChangeException when the image and intent disagree
   */
  public static void requireConsistentIntent(ProfilePhotoActionEnum action, boolean supplied) {
    if ((action == ProfilePhotoActionEnum.REPLACE) != supplied) {
      throw new InvalidProfileChangeException();
    }
  }
}
