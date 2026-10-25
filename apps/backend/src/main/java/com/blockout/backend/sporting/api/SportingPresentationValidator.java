package com.blockout.backend.sporting.api;

import com.blockout.backend.generated.mobile.model.LogoActionEnum;
import com.blockout.backend.sporting.application.exception.SportingValidationException;
import com.blockout.backend.sporting.application.model.SportingPresentation.Image;
import com.blockout.backend.sporting.application.service.ValidateSportingImage;
import java.io.IOException;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/** Reads sporting image transport after authorization; application validation owns the content. */
@org.springframework.stereotype.Component
@lombok.RequiredArgsConstructor
class SportingPresentationValidator {
  private final ValidateSportingImage images;

  /**
   * Converts the bounded binary source body without exposing low-level read failures.
   *
   * @param body native resource already bounded by multipart checks or ingestion request advice
   * @return validated original source image
   * @throws SportingValidationException when the body cannot be read or decoded
   */
  Image validateImage(Resource body) {
    try {
      return images.validate(body.getContentAsByteArray());
    } catch (IOException invalid) {
      throw new SportingValidationException();
    }
  }

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
    return validateImage(image.getResource());
  }
}
