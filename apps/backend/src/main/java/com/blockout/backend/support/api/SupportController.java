package com.blockout.backend.support.api;

import com.blockout.backend.generated.mobile.api.SupportApi;
import com.blockout.backend.generated.mobile.model.SubmitSupportRequest;
import com.blockout.backend.generated.mobile.model.SupportRequestCreatedResponse;
import com.blockout.backend.shared.http.HttpProblems;
import com.blockout.backend.support.application.CreateSupportRequest;
import com.blockout.backend.support.application.SupportUnavailableException;
import com.blockout.backend.support.application.SupportUnavailableException.Reason;
import com.blockout.backend.support.application.SupportUnavailableException.Stage;
import com.blockout.backend.support.application.SupportValidation.InvalidSubmission;
import com.blockout.backend.support.infrastructure.SupportDiagnostics;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Generated multipart entrypoint; admission and metadata validation remain with native owners. */
@RestController
@RequiredArgsConstructor
public class SupportController implements SupportApi {
  private final CreateSupportRequest create;
  private final SupportApiMapper mapper;
  private final SupportDiagnostics diagnostics;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<SupportRequestCreatedResponse> createSupportRequest(
      SubmitSupportRequest metadata, Boolean bypass, List<MultipartFile> images) {
    List<byte[]> originals = new ArrayList<>();
    try {
      if (images != null) for (MultipartFile image : images) originals.add(image.getBytes());
    } catch (IOException failure) {
      throw new SupportUnavailableException(Stage.INPUT, Reason.IO, failure);
    }
    return ResponseEntity.status(201)
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(create.create(mapper.toMetadata(metadata), originals)));
  }

  /**
   * Publishes the canonical image/input refusal without rejected filenames, values or bytes.
   *
   * @param failure safe whole-input validation classification
   * @return the existing named Problem Details profile
   */
  @ExceptionHandler(InvalidSubmission.class)
  ResponseEntity<Object> invalid(InvalidSubmission failure) {
    return switch (failure.getReason()) {
      case INVALID_INPUT ->
          HttpProblems.response(HttpStatus.BAD_REQUEST, "urn:blockout:problem:invalid-request");
      case CONTENT_TOO_LARGE ->
          HttpProblems.response(
              HttpStatus.CONTENT_TOO_LARGE, "urn:blockout:problem:payload-too-large");
      case UNSUPPORTED_IMAGE ->
          HttpProblems.response(
              HttpStatus.UNSUPPORTED_MEDIA_TYPE, "urn:blockout:problem:unsupported-media-type");
      case INVALID_IMAGE ->
          HttpProblems.response(
              HttpStatus.UNPROCESSABLE_CONTENT, "urn:blockout:problem:unprocessable-content");
    };
  }

  /**
   * Owns the single failed-intake diagnostic and the opaque refusal; partial effects may exist.
   *
   * @param failure classified failure with an internal, deliberately unlogged provider cause
   * @return ordinary unavailable response without a private reference or provider content
   */
  @ExceptionHandler(SupportUnavailableException.class)
  ResponseEntity<Object> unavailable(SupportUnavailableException failure) {
    diagnostics.failure(failure);
    return HttpProblems.response(
        HttpStatus.SERVICE_UNAVAILABLE, "urn:blockout:problem:unavailable");
  }
}
