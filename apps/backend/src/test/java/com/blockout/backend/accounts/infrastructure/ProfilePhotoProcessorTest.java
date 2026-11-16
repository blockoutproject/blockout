package com.blockout.backend.accounts.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.accounts.application.ProfilePhoto;
import com.blockout.backend.accounts.application.exception.InvalidProfilePhotoException;
import com.blockout.backend.accounts.application.exception.ProfilePhotoTooLargeException;
import com.blockout.backend.accounts.application.exception.UnsupportedProfilePhotoException;
import com.blockout.backend.shared.image.ImageFixture;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageTypeSpecifier;
import javax.imageio.ImageWriter;
import javax.imageio.metadata.IIOMetadata;
import javax.imageio.metadata.IIOMetadataNode;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

/** Synthetic images exercise native header recognition and original-byte preservation. */
@DisplayName("Original profile photo validation")
class ProfilePhotoProcessorTest {
  private final ProfilePhotoProcessor processor = new ProfilePhotoProcessor();

  @ParameterizedTest
  @CsvSource({"png,image/png,1,1", "png,image/png,1200,800", "jpeg,image/jpeg,320,600"})
  @DisplayName("Retains accepted PNG and JPEG originals without a square or 1024-pixel requirement")
  void retainsOriginalBytes(String format, String mediaType, int width, int height)
      throws Exception {
    // Given
    byte[] original = image(format, width, height);

    // When
    ProfilePhoto photo = processor.prepare(original, mediaType);

    // Then
    assertThat(photo.mediaType()).isEqualTo(mediaType);
    assertThat(photo.bytes()).isEqualTo(original);
  }

  @Test
  @DisplayName("Recognizes an image header without requiring or decoding raster data")
  void recognizesHeaderWithoutDecodingPixels() throws Exception {
    // Given
    // A complete PNG header is recognizable, but its missing pixel data cannot be decoded.
    byte[] original = Arrays.copyOf(image("png", 2, 3), 33);

    // When
    ProfilePhoto photo = processor.prepare(original, "image/png");

    // Then
    assertThat(photo.mediaType()).isEqualTo("image/png");
    assertThat(photo.bytes()).isEqualTo(original);
  }

  @Test
  @DisplayName("Rejects a recognized PNG with an unreadable header")
  void rejectsUnreadableHeader() throws Exception {
    // Given
    byte[] original = Arrays.copyOf(image("png", 2, 3), 24);

    // When / Then
    assertThatThrownBy(() -> processor.prepare(original, "image/png"))
        .isInstanceOf(InvalidProfilePhotoException.class);
  }

  @ParameterizedTest
  @NullAndEmptySource
  @ValueSource(strings = {"image/*", "image/gif", "not a media type"})
  @DisplayName("Refuses missing, malformed or unsupported media declarations")
  void rejectsUnsupportedDeclaration(String mediaType) throws Exception {
    // Given
    byte[] original = image("png", 2, 2);

    // When / Then
    assertThatThrownBy(() -> processor.prepare(original, mediaType))
        .isInstanceOf(UnsupportedProfilePhotoException.class);
  }

  @ParameterizedTest
  @ValueSource(strings = {"image/png", "image/jpeg"})
  @DisplayName("Rejects malformed or spoofed content")
  void rejectsMalformed(String mediaType) {
    // Given
    byte[] original = "not an image".getBytes(StandardCharsets.UTF_8);

    // When / Then
    assertThatThrownBy(() -> processor.prepare(original, mediaType))
        .isInstanceOf(InvalidProfilePhotoException.class);
  }

  @Test
  @DisplayName("Rejects a declaration inconsistent with actual bytes")
  void rejectsMismatchedMedia() throws Exception {
    // Given
    byte[] original = image("png", 2, 2);

    // When / Then
    assertThatThrownBy(() -> processor.prepare(original, "image/jpeg"))
        .isInstanceOf(InvalidProfilePhotoException.class);
  }

  @Test
  @DisplayName("Classifies unsupported actual content as invalid when its declaration is accepted")
  void rejectsUnsupportedActualContent() throws Exception {
    // Given
    byte[] original = image("gif", 2, 2);

    // When / Then
    assertThatThrownBy(() -> processor.prepare(original, "image/png"))
        .isInstanceOf(InvalidProfilePhotoException.class);
  }

  @Test
  @DisplayName("Refuses excessive compressed bytes before recognizing malformed content")
  void checksByteBoundBeforeContent() {
    // Given
    byte[] original = new byte[5 * 1024 * 1024 + 1];

    // When / Then
    assertThatThrownBy(() -> processor.prepare(original, "image/png"))
        .isInstanceOf(ProfilePhotoTooLargeException.class);
  }

  @Test
  @DisplayName("Preserves the accepted original including embedded PNG metadata")
  void retainsEmbeddedMetadata() throws Exception {
    // Given
    BufferedImage pixels = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
    pixels.setRGB(0, 0, 0xFF336699);
    ImageWriter writer = ImageIO.getImageWritersByFormatName("png").next();
    ByteArrayOutputStream encoded = new ByteArrayOutputStream();
    try (MemoryCacheImageOutputStream output = new MemoryCacheImageOutputStream(encoded)) {
      writer.setOutput(output);
      IIOMetadata metadata =
          writer.getDefaultImageMetadata(
              new ImageTypeSpecifier(pixels), writer.getDefaultWriteParam());
      IIOMetadataNode root = new IIOMetadataNode("javax_imageio_png_1.0");
      IIOMetadataNode text = new IIOMetadataNode("tEXt");
      IIOMetadataNode entry = new IIOMetadataNode("tEXtEntry");
      entry.setAttribute("keyword", "Comment");
      entry.setAttribute("value", "unrelated-original-metadata");
      text.appendChild(entry);
      root.appendChild(text);
      metadata.mergeTree("javax_imageio_png_1.0", root);
      writer.write(null, new IIOImage(pixels, null, metadata), writer.getDefaultWriteParam());
    } finally {
      writer.dispose();
    }
    assertThat(new String(encoded.toByteArray(), StandardCharsets.ISO_8859_1))
        .contains("unrelated-original-metadata");

    // When
    ProfilePhoto photo = processor.prepare(encoded.toByteArray(), "image/png");

    // Then
    assertThat(photo.bytes()).isEqualTo(encoded.toByteArray());
  }

  @Test
  @DisplayName("Preserves optional original text metadata without interpreting it")
  void ignoresMalformedOriginalMetadata() throws Exception {
    // Given
    byte[] original = ImageFixture.pngWithMalformedCompressedText();

    // When
    ProfilePhoto photo = processor.prepare(original, "image/png");

    // Then
    assertThat(photo.mediaType()).isEqualTo("image/png");
    assertThat(photo.bytes()).isEqualTo(original);
  }

  @Test
  @DisplayName("Accepts a valid upload exactly at the compressed byte bound")
  void acceptsByteBoundary() throws Exception {
    // Given
    byte[] original = Arrays.copyOf(image("png", 1, 1), 5 * 1024 * 1024);

    // When
    ProfilePhoto photo = processor.prepare(original, "image/png");

    // Then
    assertThat(photo.bytes()).isEqualTo(original);
  }

  /**
   * Creates deterministic RGB fixtures; no filename is used to identify actual content.
   *
   * @param format actual encoder format
   * @param width synthetic pixel width
   * @param height synthetic pixel height
   * @return encoded pixels for the current validation scenario
   * @throws Exception if the synthetic image cannot be encoded
   */
  private static byte[] image(String format, int width, int height) throws Exception {
    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    ImageIO.write(new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB), format, bytes);
    return bytes.toByteArray();
  }
}
