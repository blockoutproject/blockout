package com.blockout.backend.sporting.application.service;

import com.blockout.backend.sporting.application.model.SportingPresentation.ContactField;
import jakarta.validation.Validator;
import jakarta.validation.constraints.Email;
import java.net.URI;
import lombok.RequiredArgsConstructor;

/** Validates contact meaning consistently for collector observations and manual corrections. */
@org.springframework.stereotype.Component
@RequiredArgsConstructor
public class ClubContactValues {
  private final Validator validator;

  /**
   * Validates current field meaning without imposing a speculative phone/postcode format.
   *
   * @param field independent contact purpose
   * @param value proposed non-null value
   * @return whether this source/manual value is usable for its field
   */
  public boolean valid(ContactField field, String value) {
    if (value == null || value.isBlank() || value.codePoints().anyMatch(Character::isISOControl))
      return false;
    if (field == ContactField.EMAIL) return validator.validate(new ContactEmail(value)).isEmpty();
    if (field != ContactField.WEBSITE) return true;
    try {
      URI uri = URI.create(value);
      return ("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
          && uri.getHost() != null
          && uri.getUserInfo() == null;
    } catch (IllegalArgumentException invalid) {
      return false;
    }
  }

  /** Uses standard Bean Validation for the field-dependent email constraint. */
  private record ContactEmail(@Email String value) {}
}
