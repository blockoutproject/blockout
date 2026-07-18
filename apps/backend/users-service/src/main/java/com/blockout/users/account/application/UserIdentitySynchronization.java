package com.blockout.users.account.application;

import java.time.Instant;

/** Contains only the local fields refreshed from the external identity provider. */
public record UserIdentitySynchronization(
        String email,
        String firstName,
        String lastName,
        String phoneNumber,
        Instant lastUpdate) {
}
