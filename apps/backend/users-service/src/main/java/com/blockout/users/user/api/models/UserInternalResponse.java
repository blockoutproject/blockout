package com.blockout.users.user.api.models;

import java.time.Instant;
import java.util.List;

/** Complete handwritten internal User representation. */
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
