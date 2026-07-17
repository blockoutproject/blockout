package com.blockout.config.appstatus.application;

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
