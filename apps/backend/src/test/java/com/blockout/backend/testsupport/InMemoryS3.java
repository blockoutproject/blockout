package com.blockout.backend.testsupport;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectResponse;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;

/** Stores isolated fixture bytes at the same SDK boundary used by the transactional image owner. */
public class InMemoryS3 implements S3Client {
  private final Map<String, byte[]> objects = new ConcurrentHashMap<>();

  /** Seeds a valid reference for tests that prepare SQL fixtures directly. */
  public String putImage(byte[] bytes, String mediaType) {
    String key = "images/" + UUID.randomUUID();
    putObject(
        request -> request.bucket("blockout-test-images").key(key).contentType(mediaType),
        RequestBody.fromBytes(bytes));
    return key;
  }

  @Override
  public PutObjectResponse putObject(PutObjectRequest request, RequestBody body) {
    try (InputStream bytes = body.contentStreamProvider().newStream()) {
      objects.put(request.bucket() + "/" + request.key(), bytes.readAllBytes());
      return PutObjectResponse.builder().build();
    } catch (IOException failure) {
      throw new UncheckedIOException(failure);
    }
  }

  @Override
  public ResponseBytes<GetObjectResponse> getObjectAsBytes(GetObjectRequest request) {
    byte[] bytes = objects.get(request.bucket() + "/" + request.key());
    if (bytes == null) {
      throw NoSuchKeyException.builder().statusCode(404).build();
    }
    return ResponseBytes.fromByteArray(GetObjectResponse.builder().build(), bytes);
  }

  @Override
  public DeleteObjectResponse deleteObject(DeleteObjectRequest request) {
    objects.remove(request.bucket() + "/" + request.key());
    return DeleteObjectResponse.builder().build();
  }

  @Override
  public String serviceName() {
    return S3Client.SERVICE_NAME;
  }

  @Override
  public void close() {
    objects.clear();
  }
}
