package com.blockout.backend.sporting.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.shared.image.ImageFixture;
import com.blockout.backend.sporting.application.exception.SportingValidationException;
import com.blockout.backend.sporting.application.model.SportingPresentation.Image;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Arrays;
import javax.imageio.ImageIO;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Exercises sporting image policy with the real JDK codecs, independently of HTTP or Spring. */
@DisplayName("Sporting image content validation")
class ValidateSportingImageTest {
  private final ValidateSportingImage validator = new ValidateSportingImage();

  @ParameterizedTest
  @CsvSource({"PNG, image/png", "JPEG, image/jpeg"})
  @DisplayName("Preserves non-square image bytes with their detected media type")
  void preservesOriginalContent(String format, String mediaType) throws IOException {
    // Given
    byte[] bytes = image(format, 2, 3);

    // When
    Image image = validator.validate(bytes);

    // Then
    assertThat(image.bytes()).containsExactly(bytes);
    assertThat(image.mediaType()).isEqualTo(mediaType);
  }

  @ParameterizedTest
  @CsvSource({"PNG, 2048, 2049", "JPEG, 2049, 2048"})
  @DisplayName("Rejects a compressed image exceeding the sporting pixel budget")
  void rejectsExcessiveDecodedPixels(String format, int width, int height) throws IOException {
    // Given
    byte[] bytes = image(format, width, height);
    assertThat(bytes.length).isLessThan(ValidateSportingImage.MAX_BYTES);

    // When
    ThrowingCallable validate = () -> validator.validate(bytes);

    // Then
    assertThatThrownBy(validate).isInstanceOf(SportingValidationException.class);
  }

  @Test
  @DisplayName("Accepts a logo at the sporting pixel budget without changing its bytes")
  void acceptsDecodedPixelBoundary() throws IOException {
    // Given
    byte[] bytes = image("PNG", 2048, 2048);

    // When
    Image image = validator.validate(bytes);

    // Then
    assertThat(image.bytes()).containsExactly(bytes);
    assertThat(image.mediaType()).isEqualTo("image/png");
  }

  @Test
  @DisplayName("Preserves original trailing bytes at the compressed content bound")
  void acceptsCompressedByteBoundary() throws IOException {
    // Given
    byte[] bytes = Arrays.copyOf(image("PNG", 2, 3), ValidateSportingImage.MAX_BYTES);
    bytes[bytes.length - 1] = 42;

    // When
    Image image = validator.validate(bytes);

    // Then
    assertThat(image.bytes()).containsExactly(bytes);
  }

  @Test
  @DisplayName("Rejects compressed content above the sporting byte bound")
  void rejectsExcessiveCompressedBytes() throws IOException {
    // Given
    byte[] bytes = Arrays.copyOf(image("PNG", 1, 1), ValidateSportingImage.MAX_BYTES + 1);

    // When
    ThrowingCallable validate = () -> validator.validate(bytes);

    // Then
    assertThatThrownBy(validate).isInstanceOf(SportingValidationException.class);
  }

  @Test
  @DisplayName("Rejects empty image content")
  void rejectsEmptyContent() {
    // Given
    byte[] bytes = {};

    // When
    ThrowingCallable validate = () -> validator.validate(bytes);

    // Then
    assertThatThrownBy(validate).isInstanceOf(SportingValidationException.class);
  }

  @Test
  @DisplayName("Rejects content that cannot be recognized as an image")
  void rejectsUnrecognizedContent() {
    // Given
    byte[] bytes = {1, 2, 3};

    // When
    ThrowingCallable validate = () -> validator.validate(bytes);

    // Then
    assertThatThrownBy(validate).isInstanceOf(SportingValidationException.class);
  }

  @Test
  @DisplayName("Rejects a PNG signature without decodable image content")
  void rejectsTruncatedImage() {
    // Given
    byte[] bytes = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a};

    // When
    ThrowingCallable validate = () -> validator.validate(bytes);

    // Then
    assertThatThrownBy(validate).isInstanceOf(SportingValidationException.class);
  }

  @Test
  @DisplayName("Rejects a decodable image outside PNG and JPEG")
  void rejectsUnsupportedFormat() throws IOException {
    // Given
    byte[] bytes = image("GIF", 2, 2);

    // When
    ThrowingCallable validate = () -> validator.validate(bytes);

    // Then
    assertThatThrownBy(validate).isInstanceOf(SportingValidationException.class);
  }

  @Test
  @DisplayName("Rejects invalid source metadata even when the original pixels are decodable")
  void validatesOriginalMetadata() throws IOException {
    // Given
    byte[] bytes = ImageFixture.pngWithMalformedCompressedText();

    // When
    ThrowingCallable validate = () -> validator.validate(bytes);

    // Then
    assertThatThrownBy(validate).isInstanceOf(SportingValidationException.class);
  }

  /**
   * Encodes deterministic pixels without a filename or declared transport type.
   *
   * @param format actual native encoder format
   * @param width scenario-owned width
   * @param height scenario-owned height
   * @return complete compressed image
   * @throws IOException when the native fixture cannot be encoded
   */
  private static byte[] image(String format, int width, int height) throws IOException {
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    ImageIO.write(new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB), format, output);
    return output.toByteArray();
  }
}
