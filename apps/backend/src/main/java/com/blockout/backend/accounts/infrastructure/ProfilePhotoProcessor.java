package com.blockout.backend.accounts.infrastructure;

import com.blockout.backend.accounts.application.ProfilePhoto;
import com.blockout.backend.accounts.application.ProfilePhotoPreparation;
import com.blockout.backend.accounts.application.exception.InvalidProfilePhotoException;
import com.blockout.backend.accounts.application.exception.ProfilePhotoTooLargeException;
import com.blockout.backend.accounts.application.exception.UnsupportedProfilePhotoException;
import com.blockout.backend.shared.image.ImageDecoder;
import com.blockout.backend.shared.image.ImageDecoder.DecodedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

/** Prepares bounded photo pixels before the SQL transaction. */
@Component
public class ProfilePhotoProcessor implements ProfilePhotoPreparation {
  /**
   * {@inheritDoc}
   *
   * <p>All streams remain in memory; callers finish preparation before acquiring the account lock.
   * Native decoding ignores ancillary metadata, and re-encoding retains only accepted pixels.
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
        && !MediaType.IMAGE_JPEG.equalsTypeAndSubtype(declaredType))
      throw new UnsupportedProfilePhotoException();
    if (bytes.length > 5 * 1024 * 1024) throw new ProfilePhotoTooLargeException();
    try {
      DecodedImage image =
          ImageDecoder.decode(
              bytes,
              true,
              header -> {
                if (!MediaType.parseMediaType(header.mediaType()).equalsTypeAndSubtype(declaredType)
                    || header.width() < 1
                    || header.width() > 1024
                    || header.width() != header.height()) throw new InvalidProfilePhotoException();
              });
      try {
        ByteArrayOutputStream bytesOut = new ByteArrayOutputStream();
        try (MemoryCacheImageOutputStream output = new MemoryCacheImageOutputStream(bytesOut)) {
          if (!ImageIO.write(image.pixels(), declaredType.getSubtype(), output))
            throw new InvalidProfilePhotoException();
        }
        byte[] prepared = bytesOut.toByteArray();
        if (prepared.length > 5 * 1024 * 1024) throw new ProfilePhotoTooLargeException();
        return new ProfilePhoto(prepared, image.mediaType(), image.pixels().getWidth());
      } finally {
        image.pixels().flush();
      }
    } catch (IOException failure) {
      throw new InvalidProfilePhotoException();
    }
  }
}
