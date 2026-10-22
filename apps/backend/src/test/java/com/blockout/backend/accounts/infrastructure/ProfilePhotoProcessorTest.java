package com.blockout.backend.accounts.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.accounts.application.ProfilePhoto;
import com.blockout.backend.accounts.application.exception.InvalidProfilePhotoException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriter;
import javax.imageio.metadata.IIOMetadata;
import javax.imageio.metadata.IIOMetadataNode;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

/** Synthetic image pixels exercise actual ImageIO decoding/encoding without private assets. */
@DisplayName("Bounded profile photo preparation")
class ProfilePhotoProcessorTest {
  private final ProfilePhotoProcessor processor = new ProfilePhotoProcessor();

  @ParameterizedTest
  @CsvSource({"png,image/png,1", "png,image/png,1024", "jpeg,image/jpeg,32"})
  @DisplayName("Reencodes supported square pixels without retaining trailing source data")
  void reencodesPixels(String format, String mediaType, int dimension) throws Exception {
    // Given
    byte[] pixels = image(format, dimension, dimension);
    ByteArrayOutputStream original = new ByteArrayOutputStream();
    original.write(pixels);
    original.write("unrelated-private-metadata".getBytes(StandardCharsets.UTF_8));

    // When
    ProfilePhoto photo = processor.prepare(original.toByteArray(), mediaType);

    // Then
    assertThat(photo.mediaType()).isEqualTo(mediaType);
    assertThat(photo.dimension()).isEqualTo(dimension);
    assertThat(ImageIO.read(new ByteArrayInputStream(photo.bytes())).getWidth())
        .isEqualTo(dimension);
    assertThat(new String(photo.bytes(), StandardCharsets.ISO_8859_1))
        .doesNotContain("unrelated-private-metadata");
  }

  @ParameterizedTest
  @CsvSource({"2,1", "1025,1025"})
  @DisplayName("Rejects non-square or excessive dimensions")
  void rejectsDimensions(int width, int height) throws Exception {
    // Given
    byte[] original = image("png", width, height);

    // When / Then
    assertThatThrownBy(() -> processor.prepare(original, "image/png"))
        .isInstanceOf(InvalidProfilePhotoException.class);
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
  @DisplayName("Discards embedded PNG text metadata while retaining accepted pixels")
  void discardsEmbeddedMetadata() throws Exception {
    // Given
    BufferedImage pixels = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
    ImageWriter writer = ImageIO.getImageWritersByFormatName("png").next();
    ByteArrayOutputStream encoded = new ByteArrayOutputStream();
    try (MemoryCacheImageOutputStream output = new MemoryCacheImageOutputStream(encoded)) {
      writer.setOutput(output);
      IIOMetadata metadata =
          writer.getDefaultImageMetadata(
              new javax.imageio.ImageTypeSpecifier(pixels), writer.getDefaultWriteParam());
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
    assertThat(new String(photo.bytes(), StandardCharsets.ISO_8859_1))
        .doesNotContain("unrelated-original-metadata");
    assertThat(photo.dimension()).isEqualTo(2);
  }

  @Test
  @DisplayName("Accepts a valid upload exactly at the compressed byte bound")
  void acceptsByteBoundary() throws Exception {
    // Given
    byte[] original = java.util.Arrays.copyOf(image("png", 1, 1), 5 * 1024 * 1024);

    // When
    ProfilePhoto photo = processor.prepare(original, "image/png");

    // Then
    assertThat(photo.dimension()).isEqualTo(1);
    assertThat(photo.bytes().length).isLessThan(original.length);
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
  static byte[] image(String format, int width, int height) throws Exception {
    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    ImageIO.write(new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB), format, bytes);
    return bytes.toByteArray();
  }
}
