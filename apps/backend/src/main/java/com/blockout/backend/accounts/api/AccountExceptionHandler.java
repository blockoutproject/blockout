package com.blockout.backend.accounts.api;

import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import com.blockout.backend.accounts.application.exception.InvalidProfileChangeException;
import com.blockout.backend.accounts.application.exception.InvalidProfilePhotoException;
import com.blockout.backend.accounts.application.exception.ProfilePhotoTooLargeException;
import com.blockout.backend.accounts.application.exception.ProviderEmailUnavailableException;
import com.blockout.backend.accounts.application.exception.UnsupportedProfilePhotoException;
import com.blockout.backend.accounts.application.exception.UsernameUnavailableException;
import com.blockout.backend.shared.http.HttpProblems;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Account-owned refusals; unexpected failures retain their shared HTTP owner. */
@RestControllerAdvice
@Order(0)
public class AccountExceptionHandler {
  /** Returns the canonical whole-save input refusal, without rejected values. */
  @ExceptionHandler(InvalidProfileChangeException.class)
  ResponseEntity<Object> invalidChange() {
    return HttpProblems.response(HttpStatus.BAD_REQUEST, "urn:blockout:problem:invalid-request");
  }

  /** Returns a collision refusal without disclosing the competing account. */
  @ExceptionHandler(UsernameUnavailableException.class)
  ResponseEntity<Object> usernameUnavailable() {
    return HttpProblems.response(HttpStatus.CONFLICT, "urn:blockout:problem:username-unavailable");
  }

  /** Returns a bounded upload refusal, including reencoded output that exceeds the bound. */
  @ExceptionHandler(ProfilePhotoTooLargeException.class)
  ResponseEntity<Object> photoTooLarge() {
    return HttpProblems.response(
        HttpStatus.CONTENT_TOO_LARGE, "urn:blockout:problem:payload-too-large");
  }

  /** Refuses unsupported photo media declarations before persistence. */
  @ExceptionHandler(UnsupportedProfilePhotoException.class)
  ResponseEntity<Object> unsupportedPhoto() {
    return HttpProblems.response(
        HttpStatus.UNSUPPORTED_MEDIA_TYPE, "urn:blockout:problem:unsupported-media-type");
  }

  /** Refuses actual invalid image content without publishing decoder details. */
  @ExceptionHandler(InvalidProfilePhotoException.class)
  ResponseEntity<Object> invalidPhoto() {
    return HttpProblems.response(
        HttpStatus.UNPROCESSABLE_CONTENT, "urn:blockout:problem:invalid-image");
  }

  /** Hides missing or differently owned original accounts without disclosing identifiers. */
  @ExceptionHandler(AccountNotFoundException.class)
  ResponseEntity<Object> notFound() {
    return HttpProblems.response(HttpStatus.NOT_FOUND, "urn:blockout:problem:not-found");
  }

  /**
   * Rejects first creation without a usable provider address, without persisting a partial account.
   */
  @ExceptionHandler(ProviderEmailUnavailableException.class)
  ResponseEntity<Object> missingProviderEmail() {
    return HttpProblems.response(
        HttpStatus.UNPROCESSABLE_CONTENT, "urn:blockout:problem:provider-email-unavailable");
  }

  /** Reports unavailable evidence/admission without publishing provider messages or payloads. */
  @ExceptionHandler(AccountUnavailableException.class)
  ResponseEntity<Object> unavailable() {
    return HttpProblems.response(
        HttpStatus.SERVICE_UNAVAILABLE, "urn:blockout:problem:unavailable");
  }
}
