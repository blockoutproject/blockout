package com.blockout.backend.sporting.support;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Small decodable synthetic image content shared by sporting transport and persistence cases. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class SportingImageFixture {
  /**
   * Encodes a tiny RGB image with native JDK writers, without real club or provider artwork.
   *
   * @param format PNG or JPEG selected by the scenario
   * @param color scenario-owned RGB pixel, useful when replacement must differ
   * @return original decodable bytes
   * @throws IOException if the installed native writer fails
   */
  public static byte[] image(String format, int color) throws IOException {
    BufferedImage image = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
    image.setRGB(0, 0, color);
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    ImageIO.write(image, format, output);
    return output.toByteArray();
  }
}
