package com.blockout.backend.identity.user.application;

import java.time.Instant;
import java.util.UUID;

/**
 * Persisted owner view, independent of provider and generated HTTP models.
 *
 * @param id opaque business profile identifier
 * @param pseudo unique initial display pseudonym
 * @param email nullable contact email, never an identity key
 * @param firstName nullable given name
 * @param lastName nullable family name
 * @param phoneNumber nullable contact number
 * @param pictureUrl nullable picture location
 * @param active whether the owner allows this profile to be used
 * @param createdAt persisted creation instant
 * @param updatedAt persisted last modification instant
 */
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
