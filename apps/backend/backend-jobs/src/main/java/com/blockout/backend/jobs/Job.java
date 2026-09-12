package com.blockout.backend.jobs;

import java.util.UUID;

/** Immutable claimed work; the lease token fences every subsequent state change. */
public record Job(
    UUID id,
    String type,
    int version,
    String payload,
    UUID leaseToken,
    int attempts,
    int maxAttempts) {}
