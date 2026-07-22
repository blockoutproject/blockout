package com.blockout.mobilegateway.config.application.views;

import java.time.Instant;

/** Mobile application status projection. */
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
