package com.blockout.notifications.notification.application.views;

/**
 * Provides the pool fields required to compose a notification.
 *
 * @param name pool display name.
 * @param divisionId owning division identifier.
 */
public record PoolNotificationView(String name, Long divisionId) {
}
