package com.blockout.backend.shared.image;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.shared.image.ImageDecoder.DecodedImage;
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

/** Checks real native decoding and the feature admission boundary without mocking codecs. */
@DisplayName("Shared image decoding")
class ImageDecoderTest {
  @ParameterizedTest
  @CsvSource({"PNG,image/png", "JPEG,image/jpeg"})
  @DisplayName("Returns actual decoded pixels with the detected media type")
  void decodesSupportedContent(String format, String mediaType) throws IOException {
    // Given
    BufferedImage pixels = new BufferedImage(2, 3, BufferedImage.TYPE_INT_RGB);
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    ImageIO.write(pixels, format, output);

    // When
    DecodedImage decoded = ImageDecoder.decode(output.toByteArray(), true, header -> {});

    // Then
    assertThat(decoded.mediaType()).isEqualTo(mediaType);
    assertThat(decoded.pixels().getWidth()).isEqualTo(2);
    assertThat(decoded.pixels().getHeight()).isEqualTo(3);
    decoded.pixels().flush();
  }

  @Test
  @DisplayName("Propagates the feature's header refusal before attempting raster decoding")
  void admitsHeaderBeforeDecoding() throws IOException {
    // Given
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    ImageIO.write(new BufferedImage(2, 3, BufferedImage.TYPE_INT_RGB), "PNG", output);
    // The complete PNG header is readable, but its missing pixel data cannot be decoded.
    byte[] headerOnly = Arrays.copyOf(output.toByteArray(), 33);
    IllegalArgumentException refusal = new IllegalArgumentException("Feature rejects geometry");

    // When
    ThrowingCallable decode =
        () ->
            ImageDecoder.decode(
                headerOnly,
                true,
                header -> {
                  assertThat(header).isEqualTo(new ImageDecoder.Header("image/png", 2, 3));
                  throw refusal;
                });

    // Then
    assertThatThrownBy(decode).isSameAs(refusal);
  }

  @Test
  @DisplayName("Rejects missing raster data after an admitted header")
  void rejectsUndecodableRaster() throws IOException {
    // Given
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    ImageIO.write(new BufferedImage(2, 3, BufferedImage.TYPE_INT_RGB), "PNG", output);
    byte[] headerOnly = Arrays.copyOf(output.toByteArray(), 33);

    // When
    ThrowingCallable decode = () -> ImageDecoder.decode(headerOnly, true, header -> {});

    // Then
    assertThatThrownBy(decode).isInstanceOf(IOException.class);
  }
}
