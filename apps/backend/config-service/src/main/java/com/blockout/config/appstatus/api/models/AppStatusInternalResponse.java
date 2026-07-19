package com.blockout.config.appstatus.api.models;

import java.time.Instant;

/** Complete V1 app-status response owned by config-service. */
public record AppStatusInternalResponse(
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
