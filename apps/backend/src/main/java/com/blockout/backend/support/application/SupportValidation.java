package com.blockout.backend.support.application;

import com.blockout.backend.shared.image.ImageDecoder;
import com.blockout.backend.shared.image.ImageDecoder.DecodedImage;
import com.blockout.backend.shared.image.ImageDecoder.UnsupportedFormatException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Completes file validation before creating private originals or admitting a provider effect. */
@RequiredArgsConstructor
public final class SupportValidation {
  private static final int MAX_FILE_BYTES = 5_242_880;
  private static final long MAX_DECODED_BYTES = 64L * 1024 * 1024;

  /**
   * Existing process-owned private temporary storage, without a durable volume or user-supplied
   * filenames and paths.
   */
  private final Path temporaryDirectory;

  /**
   * Freezes and validates every selected file, then stores private originals with generated names.
   * Metadata has already passed canonical JSON binding/Bean Validation at the API boundary. The
   * servlet owns the complete 26 MiB request limit, including metadata and multipart overhead.
   *
   * @param metadata detached canonical metadata
   * @param images all selected file bytes, or an empty list for a text-only request
   * @return a snapshot whose caller must close after processing, including exceptional exits
   * @throws InvalidSubmission for excessive count/size or unsupported/invalid real image content
   * @throws IOException when private storage fails; already-created files are cleaned
   */
  public SupportSubmission validate(SupportSubmission.Metadata metadata, List<byte[]> images)
      throws IOException {
    if (images.size() > 5) throw new InvalidSubmission(Reason.INVALID_INPUT);
    for (byte[] image : images) {
      if (image.length > MAX_FILE_BYTES) throw new InvalidSubmission(Reason.CONTENT_TOO_LARGE);
    }
    List<byte[]> snapshots = images.stream().map(byte[]::clone).toList();
    List<String> mediaTypes = new ArrayList<>();
    for (byte[] image : snapshots) mediaTypes.add(validateImage(image));

    List<SupportSubmission.Image> files = new ArrayList<>();
    try {
      for (int index = 0; index < snapshots.size(); index++) {
        String mediaType = mediaTypes.get(index);
        Path file =
            Files.createTempFile(
                temporaryDirectory,
                "support-",
                mediaType.equals("image/png") ? ".png" : ".jpg",
                PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------")));
        files.add(new SupportSubmission.Image(file, mediaType));
        Files.write(file, snapshots.get(index));
      }
      return new SupportSubmission(UUID.randomUUID(), metadata, files, null);
    } catch (IOException exception) {
      try {
        new SupportSubmission(null, metadata, files, null).close();
      } catch (IOException cleanupFailure) {
        exception.addSuppressed(cleanupFailure);
      }
      throw exception;
    }
  }

  /**
   * Uses the native decoder after inspecting dimensions. Eight bytes per pixel covers PNG 16-bit
   * RGBA; three source rows cover the PNG filter/raster buffers. This conservative 64 MiB decoded
   * buffer budget is independent of the compressed-file limit and is not a total JVM heap promise.
   * Native decoding ignores ancillary text metadata while storage retains the original bytes.
   *
   * @param bytes compressed original already within the canonical file bound
   * @return content-detected PNG/JPEG media type
   * @throws InvalidSubmission for unrecognized, unsupported, excessive or undecodable content
   */
  private static String validateImage(byte[] bytes) {
    try {
      DecodedImage image =
          ImageDecoder.decode(
              bytes,
              true,
              header -> {
                // Divide first to avoid overflowing on hostile source dimensions.
                if (header.width() <= 0
                    || header.height() <= 0
                    || (long) header.width() * (header.height() + 3L) > MAX_DECODED_BYTES / 8)
                  throw new InvalidSubmission(Reason.INVALID_IMAGE);
              });
      image.pixels().flush();
      return image.mediaType();
    } catch (UnsupportedFormatException exception) {
      throw new InvalidSubmission(Reason.UNSUPPORTED_IMAGE);
    } catch (IOException exception) {
      throw new InvalidSubmission(Reason.INVALID_IMAGE);
    }
  }

  /** Safe application refusals for the future HTTP adapter; no file/contact/provider payload. */
  public enum Reason {
    INVALID_INPUT,
    CONTENT_TOO_LARGE,
    UNSUPPORTED_IMAGE,
    INVALID_IMAGE
  }

  /** Whole-input rejection, safe to classify without rendering submitted values. */
  public static final class InvalidSubmission extends RuntimeException {
    @Getter private final Reason reason;

    /**
     * Creates a refusal containing only its safe classification.
     *
     * @param reason safe refusal classification, without rejected content
     */
    public InvalidSubmission(Reason reason) {
      super("Invalid support submission");
      this.reason = reason;
    }
  }
}
