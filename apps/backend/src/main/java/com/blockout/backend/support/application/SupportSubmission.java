package com.blockout.backend.support.application;

import com.blockout.backend.generated.mobile.model.SupportPlatformEnum;
import com.blockout.backend.generated.mobile.model.SupportRequestKindEnum;
import com.blockout.backend.generated.mobile.model.SupportRequestSubjectEnum;
import com.blockout.backend.generated.mobile.model.SupportTargetTypeEnum;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

/**
 * Immutable validated snapshot for one attempt. The caller owns close after processing; files are
 * private, temporary originals, never a receipt registry. A known issue reference remains local.
 *
 * @param requestId opaque reference generated after whole-input validation
 * @param metadata validated declarations, without identity or entitlement authority
 * @param images all validated original files, in submission order
 */
public record SupportSubmission(UUID requestId, Metadata metadata, List<Path> images)
    implements AutoCloseable {
  /**
   * Freezes the image list; the snapshot owns every listed temporary file.
   *
   * @param requestId opaque reference for this validated attempt
   * @param metadata detached canonical declarations
   * @param images validated private originals owned by this snapshot
   */
  public SupportSubmission {
    images = List.copyOf(images);
  }

  /**
   * Removes every temporary original, attempting remaining cleanup even if one deletion fails.
   *
   * @throws IOException when any private temporary file could not be removed
   */
  @Override
  public void close() throws IOException {
    IOException failure = null;
    for (Path image : images) {
      try {
        Files.deleteIfExists(image);
      } catch (IOException exception) {
        if (failure == null) failure = exception;
        else failure.addSuppressed(exception);
      }
    }
    if (failure != null) throw failure;
  }

  /** Immutable content mapped from the validated canonical request; optional facts remain null. */
  public record Metadata(
      SupportRequestKindEnum kind,
      SupportRequestSubjectEnum subject,
      String title,
      String description,
      String replyEmail,
      Context context) {}

  /**
   * Allowlisted client declarations; absent facts confer no authority or private lookup permission.
   */
  public record Context(
      String screen,
      String action,
      Target target,
      UUID accountId,
      String appVersion,
      SupportPlatformEnum platform,
      String osVersion,
      String deviceModel,
      SignInFailure signInFailure) {}

  /** Navigation identity, independent of whether the target could be loaded. */
  public record Target(SupportTargetTypeEnum type, UUID id) {}

  /** Safe declared sign-in facts; the client must omit raw provider content and credentials. */
  public record SignInFailure(String method, String stage, String reason, String reference) {}
}
