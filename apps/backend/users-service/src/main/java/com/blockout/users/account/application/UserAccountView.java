package com.blockout.users.account.application;

import java.time.Instant;
import java.util.List;

/** Carries the local account state required by canonical and legacy transports. */
public record UserAccountView(
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

    /** Preserves nullable legacy favorite semantics while preventing mutable account snapshots. */
    public UserAccountView {
        favorites = favorites == null ? null : List.copyOf(favorites);
    }
}
