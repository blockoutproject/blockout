package com.blockout.backend.accounts.infrastructure;

import com.blockout.backend.accounts.application.ProfilePhoto;
import com.blockout.backend.accounts.application.ProfilePhotoPreparation;
import com.blockout.backend.accounts.application.exception.InvalidProfilePhotoException;
import com.blockout.backend.accounts.application.exception.ProfilePhotoTooLargeException;
import com.blockout.backend.accounts.application.exception.UnsupportedProfilePhotoException;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Iterator;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.MemoryCacheImageInputStream;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

/** Recognizes original photo headers before the SQL transaction. */
@Component
public class ProfilePhotoProcessor implements ProfilePhotoPreparation {
  /**
   * {@inheritDoc}
   *
   * <p>All streams remain in memory; callers finish preparation before acquiring the account lock.
   * Native header recognition allocates no pixel raster and does not establish full pixel validity.
   * Accepted original bytes remain unchanged.
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
    try (MemoryCacheImageInputStream input =
        new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
      Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
      if (!readers.hasNext()) {
        throw new InvalidProfilePhotoException();
      }
      ImageReader reader = readers.next();
      try {
        String format = reader.getFormatName();
        MediaType actualType;
        if ("PNG".equalsIgnoreCase(format)) {
          actualType = MediaType.IMAGE_PNG;
        } else if ("JPEG".equalsIgnoreCase(format)) {
          actualType = MediaType.IMAGE_JPEG;
        } else {
          throw new InvalidProfilePhotoException();
        }
        reader.setInput(input, true, true);
        if (!actualType.equalsTypeAndSubtype(declaredType)
            || reader.getWidth(0) < 1
            || reader.getHeight(0) < 1) {
          throw new InvalidProfilePhotoException();
        }
        return new ProfilePhoto(bytes, actualType.toString());
      } finally {
        reader.dispose();
      }
    } catch (IOException failure) {
      throw new InvalidProfilePhotoException();
    }
  }
}
