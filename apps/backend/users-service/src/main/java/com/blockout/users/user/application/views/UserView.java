package com.blockout.users.user.application.views;

import java.time.Instant;
import java.util.List;

/**
 * Complete application read model for the owned User resource.
 */
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
    List<UserFavoriteSummaryView> favorites) {
}
