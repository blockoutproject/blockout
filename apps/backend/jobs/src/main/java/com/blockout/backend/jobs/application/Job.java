package com.blockout.backend.jobs.application;

import java.util.UUID;

/**
 * Immutable claimed work; the lease token fences subsequent state changes.
 *
 * @param id durable job identity reused across attempts
 * @param type owner-defined work type
 * @param version payload contract version
 * @param payload serialized JSON owned by the handler
 * @param leaseToken unique fence for this reservation
 * @param attempts one-based attempt number including this claim
 * @param maxAttempts total allowed reservations before dead state
 */
public record Job(
    UUID id,
    String type,
    int version,
    String payload,
    UUID leaseToken,
    int attempts,
    int maxAttempts) {}
