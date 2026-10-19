package com.blockout.backend.shared.image;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Iterator;
import javax.imageio.IIOException;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.MemoryCacheImageInputStream;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Validates actual PNG/JPEG content independently of transport and feature-specific image rules.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ImageValidator {

  /**
   * Decodes an image without trusting an upload's filename or declared media type.
   *
   * @param bytes non-null original image content; callers own size and presence constraints
   * @return original bytes with their detected media type, without re-encoding
   * @throws IOException if the content is unsupported or cannot be decoded
   */
  public static ValidatedImage validate(byte[] bytes) throws IOException {
    try (MemoryCacheImageInputStream input =
        new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
      Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
      if (!readers.hasNext()) throw new IIOException("Unrecognized image content");
      ImageReader reader = readers.next();
      try {
        String format = reader.getFormatName();
        String mediaType;
        if ("PNG".equalsIgnoreCase(format)) mediaType = "image/png";
        else if ("JPEG".equalsIgnoreCase(format)) mediaType = "image/jpeg";
        else throw new IIOException("Only PNG and JPEG images are supported");
        reader.setInput(input);
        reader.read(0);
        return new ValidatedImage(bytes, mediaType);
      } finally {
        reader.dispose();
      }
    }
  }

  /** Validated original image bytes and their actual media type for the consuming feature. */
  public record ValidatedImage(byte[] bytes, String mediaType) {}
}
