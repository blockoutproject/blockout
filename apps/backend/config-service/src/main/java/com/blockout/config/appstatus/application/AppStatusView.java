package com.blockout.config.appstatus.application;

import java.time.Instant;

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
