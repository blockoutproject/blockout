package com.blockout.backend.sporting.application.service;

import com.blockout.backend.shared.image.ImageValidator;
import com.blockout.backend.shared.image.ImageValidator.ValidatedImage;
import com.blockout.backend.sporting.application.exception.SportingValidationException;
import com.blockout.backend.sporting.application.model.SportingPresentation.Image;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Bounded content validation outside database transactions, shared by source and manual uploads.
 */
@Service
@RequiredArgsConstructor
public class ValidateSportingImage {
  public static final int MAX_BYTES = 5_242_880;

  /**
   * Decodes actual PNG/JPEG content outside a write transaction after the caller's grant preflight.
   *
   * @param bytes original bounded content, never an arbitrary URL
   * @return immutable original bytes with their detected content type
   * @throws SportingValidationException for oversized, unsupported or undecodable content
   */
  @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NEVER)
  public Image validate(byte[] bytes) {
    if (bytes.length == 0 || bytes.length > MAX_BYTES) throw new SportingValidationException();
    try {
      ValidatedImage validated = ImageValidator.validate(bytes);
      return new Image(validated.bytes(), validated.mediaType());
    } catch (IOException invalid) {
      throw new SportingValidationException();
    }
  }
}
