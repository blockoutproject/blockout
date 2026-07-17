package com.blockout.users.account.application;

/** Carries the Auth0-owned profile fields consumed by local account synchronization. */
public record IdentityProfile(
        String id,
        String email,
        String firstName,
        String lastName,
        String pictureUrl,
        String phoneNumber) {
}
