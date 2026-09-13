package com.blockout.backend.identity.user.infrastructure.auth0;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;

/**
 * Nullable provider attributes are bounded once before entering the profile creation transaction.
 */
record Auth0Profile(
    @JsonProperty("user_id") @NotBlank @Size(max = 255) String subject,
    @Size(max = 320) String email,
    @JsonProperty("given_name") @Size(max = 255) String firstName,
    @JsonProperty("family_name") @Size(max = 255) String lastName,
    @JsonProperty("phone_number") @Size(max = 64) String phoneNumber,
    @JsonProperty("picture") @Size(max = 2048) String pictureUrl) {}
