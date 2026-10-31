package com.blockout.backend.support.application;

import com.blockout.backend.support.application.SupportUnavailableException.Reason;
import com.blockout.backend.support.application.SupportUnavailableException.Stage;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/** One synchronous complete send, with transient file ownership and no SQL/provider transaction. */
@Service
@RequiredArgsConstructor
@Slf4j
public class CreateSupportRequest {
  private final SupportValidation validation;
  private final SupportCases cases;
  private final SupportAttachments attachments;
  private final SupportSignal signal;

  /**
   * Validates all files before effects, then creates, attaches and completes the private case.
   * Input metadata has passed canonical HTTP validation. An explicit retry creates a new attempt.
   *
   * @param metadata canonically validated declarations, never authorization
   * @param images every selected original, empty for text-only intake
   * @return opaque UUID only after complete private receipt
   * @throws SupportValidation.InvalidSubmission for invalid whole input, before provider effects
   * @throws SupportUnavailableException for unconfirmed receipt, possibly with partial effects
   */
  public UUID create(SupportSubmission.Metadata metadata, List<byte[]> images) {
    SupportSubmission submission;
    try {
      submission = validation.validate(metadata, images);
    } catch (IOException failure) {
      throw new SupportUnavailableException(Stage.INPUT, Reason.IO, failure);
    }
    boolean childStopped = true;
    try {
      long issue = cases.create(SupportCaseDraft.from(submission));
      if (!submission.images().isEmpty()) {
        attachments.attach(issue, submission.images());
        cases.complete(issue);
      }
      signal.accepted();
      return submission.requestId();
    } catch (SupportUnavailableException failure) {
      childStopped = failure.getReason() != Reason.TERMINATION_FAILED;
      throw failure;
    } finally {
      // Do not remove bytes underneath a child whose termination could not be established.
      if (childStopped) cleanup(submission);
    }
  }

  /**
   * Removes transient originals after processing; cleanup failure cannot undo complete receipt.
   *
   * @param submission current attempt whose child has stopped
   */
  private static void cleanup(SupportSubmission submission) {
    try {
      submission.close();
    } catch (IOException failure) {
      log.atError()
          .addKeyValue("operation", "support_intake")
          .addKeyValue("stage", "cleanup")
          .addKeyValue("outcome", "failed")
          .addKeyValue("reason", "io")
          .log("Support temporary cleanup failed");
    }
  }
}
