package com.blockout.backend.shared.image;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.util.zip.CRC32;
import javax.imageio.ImageIO;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Synthetic codec edge shared by the three features' different metadata admission policies. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ImageFixture {
  /**
   * Adds an invalid compressed-text payload to an otherwise valid square PNG. Its chunk length and
   * CRC are correct, isolating metadata parsing from header and pixel validity.
   *
   * @return synthetic original bytes without any personal metadata
   * @throws IOException if the native fixture cannot be encoded
   */
  public static byte[] pngWithMalformedCompressedText() throws IOException {
    ByteArrayOutputStream original = new ByteArrayOutputStream();
    ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "PNG", original);
    byte[] source = original.toByteArray();
    ByteArrayOutputStream mutated = new ByteArrayOutputStream();
    // Insert after the complete 33-byte PNG signature and IHDR, before pixel data.
    mutated.write(source, 0, 33);
    DataOutputStream output = new DataOutputStream(mutated);
    byte[] chunk = {'z', 'T', 'X', 't', 'C', 0, 0, 1, 2, 3};
    output.writeInt(chunk.length - 4);
    output.write(chunk);
    CRC32 crc = new CRC32();
    crc.update(chunk);
    output.writeInt((int) crc.getValue());
    mutated.write(source, 33, source.length - 33);
    return mutated.toByteArray();
  }
}
