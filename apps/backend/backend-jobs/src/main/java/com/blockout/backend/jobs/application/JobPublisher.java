package com.blockout.backend.jobs.application;

/**
 * Persistence boundary for work published atomically with the transaction owning its durable cause.
 */
public interface JobPublisher {
  /**
   * Requires an active transaction on the configured job datasource. The owner must roll back if a
   * rejected publication makes its write invalid. Identical canonical JSON and version reuse the
   * existing UUID for a type/key; changed content returns a conflict without replacing that work.
   * Object keys are sorted, number scale is ignored, and array order is significant.
   *
   * <p>Types match {@code [a-z][a-z0-9.-]{0,99}}, versions start at one, nonblank keys have at most
   * 200 characters, and serialized payloads have at most 64 KiB of UTF-8 bytes. Invalid identity or
   * size returns a rejection. Serialization and database failures propagate to the transaction
   * owner.
   *
   * @throws IllegalStateException if the caller has no transaction on the job datasource
   */
  PublicationResult publish(String type, int version, String key, Object payload);
}
