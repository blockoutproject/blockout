package com.blockout.config.appstatus.application.commands;

/**
 * Application command carrying a partial app-status update.
 */
public record UpdateAppStatusCommand(
    Boolean maintenance,
    String message,
    String imageUrl,
    String minVersionIos,
    String minVersionAndroid,
    String storeUrlIos,
    String storeUrlAndroid,
    String forceUpdateMessage) {
}
