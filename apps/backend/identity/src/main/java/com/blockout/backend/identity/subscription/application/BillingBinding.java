package com.blockout.backend.identity.subscription.application;

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
    UUID userId, String projectId, String environment, String customerId) {}
