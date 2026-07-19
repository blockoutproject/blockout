package com.blockout.users.user.application.models;

/** Provider-neutral identity data required by users-service. */
public record ExternalUserProfile(
        String id,
        String email,
        String firstName,
        String lastName,
        String pictureUrl,
        String phoneNumber) {
}
