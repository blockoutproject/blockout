package com.blockout.backend.notifications.infrastructure;

import com.blockout.backend.notifications.domain.NotificationFamily;
import com.blockout.backend.notifications.domain.NotificationVariant;
import java.time.Instant;
import java.util.UUID;

/**
 * Native scalar keyset projection includes both non-null sort keys and immutable editorial choice.
 */
public record NotificationRow(
    UUID id,
    UUID matchId,
    Instant createdAt,
    NotificationFamily family,
    NotificationVariant variant,
    boolean read) {}
