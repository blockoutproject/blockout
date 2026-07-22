package com.blockout.mobilegateway.config.application.commands;

/** Values accepted when updating mobile application status. */
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
