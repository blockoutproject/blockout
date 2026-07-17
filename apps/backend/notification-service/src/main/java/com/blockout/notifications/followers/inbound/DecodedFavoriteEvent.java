package com.blockout.notifications.followers.inbound;

import com.blockout.notifications.followers.application.FollowerProjectionCommand;
import java.util.UUID;

public record DecodedFavoriteEvent(
        UUID eventId,
        String eventIdHeader,
        String eventType,
        FollowerProjectionCommand command) {
}
