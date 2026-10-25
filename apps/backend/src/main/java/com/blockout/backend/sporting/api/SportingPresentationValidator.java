package com.blockout.backend.sporting.api;

import com.blockout.backend.generated.mobile.model.LogoActionEnum;
import com.blockout.backend.sporting.application.exception.SportingValidationException;
import com.blockout.backend.sporting.application.model.SportingPresentation.Image;
import com.blockout.backend.sporting.application.service.ValidateSportingImage;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/** Shared cross-part validation for the canonical creation and presentation editors. */
@org.springframework.stereotype.Component
@lombok.RequiredArgsConstructor
class SportingPresentationValidator {
  private final ValidateSportingImage images;

  /**
   * Validates complete image/action consistency and content before starting an owner transaction.
   *
   * @param action complete desired logo action
   * @param image optional actual bytes, independent from their filename or declared type
   * @return validated replacement, or null for keep/automatic
   */
  Image validateImage(LogoActionEnum action, MultipartFile image) {
    if (action != LogoActionEnum.REPLACE) {
      if (image != null) throw new SportingValidationException();
      return null;
    }
    if (image == null || image.isEmpty()) throw new SportingValidationException();
    if (image.getSize() > ValidateSportingImage.MAX_BYTES)
      throw new ResponseStatusException(HttpStatus.CONTENT_TOO_LARGE);
    try {
      return images.validate(image.getBytes());
    } catch (IOException invalid) {
      throw new SportingValidationException();
    }
  }
}
