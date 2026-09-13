package com.blockout.backend.identity.subscription.domain;

import java.time.Instant;

/**
 * Current owner decision.
 *
 * @param state access state at evaluation time
 * @param usableUntil local access deadline, null when access is not allowed
 */
public record SubscriptionDecision(SubscriptionState state, Instant usableUntil) {}
