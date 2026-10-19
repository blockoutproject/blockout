package com.blockout.backend.shared.image;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.shared.image.ImageValidator.ValidatedImage;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Exercises actual image content with the JDK codecs, independently of HTTP or Spring. */
@DisplayName("Shared image content validation")
class ImageValidatorTest {

  @ParameterizedTest
  @CsvSource({"PNG, image/png", "JPEG, image/jpeg"})
  @DisplayName("Preserves supported image bytes with their detected media type")
  void validatesSupportedImage(String format, String mediaType) throws IOException {
    // Given
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), format, output);
    byte[] bytes = output.toByteArray();

    // When
    ValidatedImage image = ImageValidator.validate(bytes);

    // Then
    assertThat(image.bytes()).containsExactly(bytes);
    assertThat(image.mediaType()).isEqualTo(mediaType);
  }

  @Test
  @DisplayName("Rejects content that cannot be recognized as an image")
  void rejectsUnrecognizedContent() {
    // Given
    byte[] bytes = {1, 2, 3};

    // When
    ThrowingCallable validate = () -> ImageValidator.validate(bytes);

    // Then
    assertThatThrownBy(validate).isInstanceOf(IOException.class);
  }

  @Test
  @DisplayName("Rejects a PNG signature without decodable image content")
  void rejectsTruncatedImage() {
    // Given
    byte[] bytes = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a};

    // When
    ThrowingCallable validate = () -> ImageValidator.validate(bytes);

    // Then
    assertThatThrownBy(validate).isInstanceOf(IOException.class);
  }

  @Test
  @DisplayName("Rejects a decodable image outside the supported PNG and JPEG formats")
  void rejectsUnsupportedFormat() throws IOException {
    // Given
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    assertThat(ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "GIF", output))
        .isTrue();
    byte[] bytes = output.toByteArray();

    // When
    ThrowingCallable validate = () -> ImageValidator.validate(bytes);

    // Then
    assertThatThrownBy(validate).isInstanceOf(IOException.class);
  }
}
