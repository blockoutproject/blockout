package com.blockout.config.appstatus.application.views;

import java.time.Instant;

/** Application view of the app-status singleton. */
public record AppStatusView(
        boolean maintenance,
        String message,
        String imageUrl,
        String minVersionIos,
        String minVersionAndroid,
        String storeUrlIos,
        String storeUrlAndroid,
        String forceUpdateMessage,
        Instant lastUpdate) {
}
