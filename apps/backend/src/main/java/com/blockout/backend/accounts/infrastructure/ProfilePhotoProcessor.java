package com.blockout.backend.accounts.infrastructure;

import com.blockout.backend.accounts.application.ProfilePhoto;
import com.blockout.backend.accounts.application.ProfilePhotoPreparation;
import com.blockout.backend.accounts.application.exception.InvalidProfilePhotoException;
import com.blockout.backend.accounts.application.exception.ProfilePhotoTooLargeException;
import com.blockout.backend.accounts.application.exception.UnsupportedProfilePhotoException;
import com.blockout.backend.shared.image.ImageDecoder;
import com.blockout.backend.shared.image.ImageDecoder.DecodedImage;
import java.io.IOException;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

/** Validates original photo bytes before the SQL transaction. */
@Component
public class ProfilePhotoProcessor implements ProfilePhotoPreparation {
  /**
   * {@inheritDoc}
   *
   * <p>All streams remain in memory; callers finish preparation before acquiring the account lock.
   * Native decoding ignores ancillary metadata; accepted original bytes remain unchanged.
   */
  @Override
  public ProfilePhoto prepare(byte[] bytes, String mediaType) {
    MediaType declaredType;
    try {
      declaredType = MediaType.parseMediaType(mediaType);
    } catch (InvalidMediaTypeException failure) {
      throw new UnsupportedProfilePhotoException();
    }
    if (!MediaType.IMAGE_PNG.equalsTypeAndSubtype(declaredType)
        && !MediaType.IMAGE_JPEG.equalsTypeAndSubtype(declaredType)) {
      throw new UnsupportedProfilePhotoException();
    }
    if (bytes.length > 5 * 1024 * 1024) {
      throw new ProfilePhotoTooLargeException();
    }
    try {
      DecodedImage image =
          ImageDecoder.decode(
              bytes,
              true,
              header -> {
                if (!MediaType.parseMediaType(header.mediaType()).equalsTypeAndSubtype(declaredType)
                    || header.width() < 1
                    || header.height() < 1) {
                  throw new InvalidProfilePhotoException();
                }
              });
      image.pixels().flush();
      return new ProfilePhoto(bytes, image.mediaType());
    } catch (IOException failure) {
      throw new InvalidProfilePhotoException();
    }
  }
}
