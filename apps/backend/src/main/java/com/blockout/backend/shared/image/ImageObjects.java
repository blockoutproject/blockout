package com.blockout.backend.shared.image;

import java.util.UUID;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;

/** S3 operations for already validated application images and their SQL publication lifecycle. */
@Component
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
@Slf4j
public class ImageObjects {
  private final S3Client s3;
  private final ImageStorageProperties properties;

  /** Returns the environment's owned bucket for private cleanup diagnostics. */
  public String bucket() {
    return properties.bucket();
  }

  /** Reads the exact object referenced by an authorized feature operation. */
  public byte[] read(String key) {
    return read(bucket(), key);
  }

  /** Reads a verified legacy association from its original bucket and key. */
  public byte[] read(String bucket, String key) {
    try {
      return s3.getObjectAsBytes(request -> request.bucket(bucket).key(key)).asByteArray();
    } catch (SdkException failure) {
      throw new DataAccessResourceFailureException("Application image read unavailable", failure);
    }
  }

  /**
   * Uploads a fresh object before its owner publishes the association. Register cleanup before the
   * request since S3 can accept the write even when the caller loses the response.
   */
  public String put(byte[] bytes, String mediaType) {
    String key = "images/" + UUID.randomUUID();
    cleanOnCompletion(key, TransactionSynchronization.STATUS_ROLLED_BACK);
    try {
      s3.putObject(
          request -> request.bucket(bucket()).key(key).contentType(mediaType),
          RequestBody.fromBytes(bytes));
      return key;
    } catch (SdkException failure) {
      throw new DataAccessResourceFailureException("Application image upload unavailable", failure);
    }
  }

  /** Keeps the old object readable until its SQL association has been superseded. */
  public void deleteAfterCommit(String key) {
    cleanOnCompletion(key, TransactionSynchronization.STATUS_COMMITTED);
  }

  /** Deletes an owned object for an already committed operation with its own failure handling. */
  public void delete(String key) {
    s3.deleteObject(request -> request.bucket(bucket()).key(key));
  }

  private void cleanOnCompletion(String key, int deleteOn) {
    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCompletion(int status) {
            if (status == STATUS_UNKNOWN) {
              reportCleanup("transaction_outcome_unknown");
            } else if (status == deleteOn) {
              try {
                delete(key);
              } catch (SdkException failure) {
                reportCleanup("object_deletion_unconfirmed");
              }
            }
          }
        });
  }

  private static void reportCleanup(String reason) {
    log.atWarn()
        .addKeyValue("operation", "application_image_cleanup")
        .addKeyValue("outcome", "manual_resolution_required")
        .addKeyValue("reason", reason)
        .log("Application image cleanup requires verification");
  }
}
