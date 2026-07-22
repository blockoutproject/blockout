package com.blockout.mobilegateway.user.application.views;

import java.time.Instant;
import java.util.List;

/** User projection used by the gateway application layer. */
public record UserView(
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
        List<UserFavoriteView> favorites) {
}
