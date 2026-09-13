package com.blockout.backend.identity.subscription.domain;

import java.time.Instant;

/**
 * Last complete observation; failed attempts never change its timestamp.
 *
 * @param positive null until verified or after transfer invalidation
 * @param verifiedAt time of the last complete provider observation
 * @param accessExpiresAt reliable access expiry, never an inferred billing boundary
 * @param failure latest failed attempt classification, cleared on success
 */
public record SubscriptionEvidence(
    Boolean positive, Instant verifiedAt, Instant accessExpiresAt, SubscriptionFailure failure) {}
