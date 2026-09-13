package com.blockout.backend.identity.user.infrastructure.auth0;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;

/**
 * Provider transport record validated before entering the profile creation transaction.
 *
 * @param subject provider user_id that must exactly match the authenticated subject
 * @param email nullable bounded contact email
 * @param firstName nullable bounded given name
 * @param lastName nullable bounded family name
 * @param phoneNumber nullable bounded contact number
 * @param pictureUrl nullable bounded picture location
 */
record Auth0Profile(
    @JsonProperty("user_id") @NotBlank @Size(max = 255) String subject,
    @Size(max = 320) String email,
    @JsonProperty("given_name") @Size(max = 255) String firstName,
    @JsonProperty("family_name") @Size(max = 255) String lastName,
    @JsonProperty("phone_number") @Size(max = 64) String phoneNumber,
    @JsonProperty("picture") @Size(max = 2048) String pictureUrl) {}
