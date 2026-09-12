package com.blockout.backend.identity.user.application;

import java.time.Instant;
import java.util.UUID;

/** Owner read projection, independent of persistence, provider and generated HTTP models. */
public record UserProfile(
    UUID id,
    String pseudo,
    String email,
    String firstName,
    String lastName,
    String phoneNumber,
    String pictureUrl,
    boolean active,
    Instant createdAt,
    Instant updatedAt) {}
