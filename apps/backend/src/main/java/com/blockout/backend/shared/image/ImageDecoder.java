package com.blockout.backend.shared.image;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.function.Consumer;
import javax.imageio.IIOException;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.MemoryCacheImageInputStream;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Native PNG/JPEG decoding with caller-owned admission before raster allocation. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ImageDecoder {
  /**
   * Detects actual content, admits its header, then decodes pixels using memory-backed streams. The
   * feature owns compressed-byte limits, geometry rules and any subsequent re-encoding. Streams and
   * readers are closed even when admission rejects the image.
   *
   * @param bytes non-null original content already within the caller's compressed-byte limit
   * @param ignoreMetadata native metadata handling retained by the feature's existing image policy
   * @param admission feature policy invoked on detected format and dimensions before pixel decoding
   * @return decoded pixels owned by the caller and their actual media type
   * @throws UnsupportedFormatException when a recognized image is neither PNG nor JPEG
   * @throws IOException when actual image content cannot be recognized or decoded
   */
  public static DecodedImage decode(
      byte[] bytes, boolean ignoreMetadata, Consumer<Header> admission) throws IOException {
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
        else throw new UnsupportedFormatException();
        reader.setInput(input, true, ignoreMetadata);
        admission.accept(new Header(mediaType, reader.getWidth(0), reader.getHeight(0)));
        return new DecodedImage(reader.read(0), mediaType);
      } finally {
        reader.dispose();
      }
    }
  }

  /** Actual content metadata available to the owning feature before raster allocation. */
  public record Header(String mediaType, int width, int height) {}

  /** Decoded pixels for validation or re-encoding; original bytes remain with the caller. */
  public record DecodedImage(BufferedImage pixels, String mediaType) {}

  /** Recognized unsupported content, distinct from unrecognizable or corrupt PNG/JPEG bytes. */
  public static final class UnsupportedFormatException extends IOException {
    /** Creates the safe format refusal without retaining source content or metadata. */
    public UnsupportedFormatException() {
      super("Only PNG and JPEG images are supported");
    }
  }
}
