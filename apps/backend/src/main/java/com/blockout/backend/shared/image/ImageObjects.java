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
  /** Fixed namespaces for new owned objects. Stored keys identify existing objects directly. */
  public enum Category {
    PROFILES("profiles"),
    CLUBS("clubs"),
    TEAMS("teams"),
    DIVISIONS("divisions");

    private final String segment;

    Category(String segment) {
      this.segment = segment;
    }
  }

  private final S3Client s3;
  private final ImageStorageProperties properties;

  /** Returns the configured bucket for private cleanup diagnostics. */
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
   * Uploads a replacement before the caller publishes it in the current SQL transaction.
   *
   * @param category namespace for a new owned object
   * @param previousOwnedKey current key eligible for deletion, or null for absent or legacy content
   * @param bytes accepted replacement, or null for explicit removal
   * @param mediaType detected type of a replacement, or null for removal
   * @return fresh owned key, or null when clearing the reference
   */
  public String replace(
      Category category, String previousOwnedKey, byte[] bytes, String mediaType) {
    String replacementKey =
        bytes == null ? null : "v2/images/" + category.segment + "/" + UUID.randomUUID();
    if (previousOwnedKey != null || replacementKey != null) {
      // A lost response can leave an object even if putObject never returns successfully.
      cleanOnCompletion(previousOwnedKey, replacementKey);
    }
    if (replacementKey == null) {
      return null;
    }
    try {
      s3.putObject(
          request -> request.bucket(bucket()).key(replacementKey).contentType(mediaType),
          RequestBody.fromBytes(bytes));
      return replacementKey;
    } catch (SdkException failure) {
      throw new DataAccessResourceFailureException("Application image upload unavailable", failure);
    }
  }

  /** Deletes an owned object for an already committed operation with its own failure handling. */
  public void delete(String key) {
    s3.deleteObject(request -> request.bucket(bucket()).key(key));
  }

  private void cleanOnCompletion(String previousOwnedKey, String replacementKey) {
    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCompletion(int status) {
            if (status == STATUS_UNKNOWN) {
              reportCleanup("transaction_outcome_unknown");
              return;
            }
            String obsoleteKey = status == STATUS_COMMITTED ? previousOwnedKey : replacementKey;
            if (obsoleteKey != null) {
              try {
                delete(obsoleteKey);
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
