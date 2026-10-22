package com.blockout.backend.accounts.infrastructure;

import com.blockout.backend.accounts.application.ProfilePhoto;
import com.blockout.backend.accounts.application.exception.InvalidProfilePhotoException;
import com.blockout.backend.accounts.application.exception.ProfilePhotoTooLargeException;
import com.blockout.backend.accounts.application.exception.UnsupportedProfilePhotoException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.MemoryCacheImageInputStream;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import org.springframework.stereotype.Component;

/** Prepares bounded photo pixels before the SQL transaction. */
@Component
public class ProfilePhotoProcessor {
  /**
   * Decodes only bounded square PNG/JPEG and writes fresh pixels without source metadata. All
   * streams remain in memory; callers finish this step before acquiring the account lock.
   *
   * @param bytes compressed original part, at most 5 MiB
   * @param mediaType declared media type, checked against detected content
   * @return reencoded pixels with their actual type and square dimension
   * @throws InvalidProfilePhotoException for unreadable, spoofed or out-of-bounds pixels
   * @throws ProfilePhotoTooLargeException for excessive input or output bytes
   * @throws UnsupportedProfilePhotoException for an unsupported media declaration
   */
  public ProfilePhoto prepare(byte[] bytes, String mediaType) {
    if (!"image/png".equals(mediaType) && !"image/jpeg".equals(mediaType))
      throw new UnsupportedProfilePhotoException();
    if (bytes.length > 5 * 1024 * 1024) throw new ProfilePhotoTooLargeException();
    try (MemoryCacheImageInputStream input =
        new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
      Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
      if (!readers.hasNext()) throw new InvalidProfilePhotoException();
      ImageReader reader = readers.next();
      try {
        String format = reader.getFormatName();
        String detected =
            switch (format.toUpperCase(java.util.Locale.ROOT)) {
              case "PNG" -> "image/png";
              case "JPEG" -> "image/jpeg";
              default -> throw new InvalidProfilePhotoException();
            };
        if (!detected.equals(mediaType)) throw new InvalidProfilePhotoException();
        reader.setInput(input, true, true);
        int dimension = reader.getWidth(0);
        if (dimension < 1 || dimension > 1024 || dimension != reader.getHeight(0))
          throw new InvalidProfilePhotoException();
        BufferedImage pixels = reader.read(0);
        ByteArrayOutputStream bytesOut = new ByteArrayOutputStream();
        try (MemoryCacheImageOutputStream output = new MemoryCacheImageOutputStream(bytesOut)) {
          if (!ImageIO.write(pixels, format, output)) throw new InvalidProfilePhotoException();
        }
        byte[] prepared = bytesOut.toByteArray();
        if (prepared.length > 5 * 1024 * 1024) throw new ProfilePhotoTooLargeException();
        return new ProfilePhoto(prepared, detected, dimension);
      } finally {
        reader.dispose();
      }
    } catch (IOException failure) {
      throw new InvalidProfilePhotoException();
    }
  }
}
