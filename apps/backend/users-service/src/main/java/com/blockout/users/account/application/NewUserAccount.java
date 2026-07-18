package com.blockout.users.account.application;

import java.time.Instant;

/** Describes one new local account derived from an external identity. */
public record NewUserAccount(
        String auth0Id,
        String email,
        String pseudo,
        String firstName,
        String lastName,
        String pictureUrl,
        String phoneNumber,
        boolean active,
        Instant createdAt,
        Instant lastUpdate) {
}
