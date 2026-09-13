package com.blockout.backend.identity.subscription.application;

import com.blockout.backend.identity.subscription.domain.BillingEnvironment;
import java.util.UUID;

/**
 * Retained subscription identity, never derived from a new business UUID.
 *
 * @param userId local owner
 * @param projectId retained RevenueCat project
 * @param environment exact production or sandbox namespace
 * @param customerId retained canonical Auth0 subject
 */
public record BillingBinding(
    UUID userId, String projectId, BillingEnvironment environment, String customerId) {}
