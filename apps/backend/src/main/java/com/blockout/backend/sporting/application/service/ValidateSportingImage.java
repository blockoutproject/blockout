package com.blockout.backend.sporting.application.service;

import com.blockout.backend.shared.image.ImageDecoder;
import com.blockout.backend.shared.image.ImageDecoder.DecodedImage;
import com.blockout.backend.sporting.application.exception.SportingValidationException;
import com.blockout.backend.sporting.application.model.SportingPresentation.Image;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Bounded content validation outside database transactions, shared by source and manual uploads.
 */
@Service
@RequiredArgsConstructor
public class ValidateSportingImage {
  public static final int MAX_BYTES = 5_242_880;
  private static final long MAX_DECODED_PIXELS = 4_194_304L;

  /**
   * Decodes actual PNG/JPEG content outside a write transaction after the caller's grant preflight.
   * Retains native validation of the original metadata, unlike profile/support preparation.
   *
   * @param bytes original bounded content, never an arbitrary URL
   * @return immutable original bytes with their detected content type
   * @throws SportingValidationException for oversized, unsupported or undecodable content
   */
  @Transactional(propagation = Propagation.NEVER)
  public Image validate(byte[] bytes) {
    if (bytes.length == 0 || bytes.length > MAX_BYTES) throw new SportingValidationException();
    try {
      DecodedImage image =
          ImageDecoder.decode(
              bytes,
              false,
              header -> {
                if ((long) header.width() * header.height() > MAX_DECODED_PIXELS)
                  throw new SportingValidationException();
              });
      image.pixels().flush();
      return new Image(bytes, image.mediaType());
    } catch (IOException invalid) {
      throw new SportingValidationException();
    }
  }
}
