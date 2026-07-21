package com.blockout.matches.match.infrastructure.http.models;

import java.time.Instant;
import java.util.List;

/**
 * Complete User response owned by users-service.
 */
public record UserInternalResponse(
    Long id,
    String auth0Id,
    String email,
    String pseudo,
    String firstName,
    String lastName,
    String pictureUrl,
    String phoneNumber,
    Boolean active,
    Instant createdAt,
    Instant lastUpdate,
    List<UserFavoriteSummaryInternalResponse> favorites) {
}
