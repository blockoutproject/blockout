package com.blockout.config.appstatus.api.models;

/**
 * Partial V1 request for updating the app-status singleton.
 */
public record UpdateAppStatusInternalRequest(
    Boolean maintenance,
    String message,
    String imageUrl,
    String minVersionIos,
    String minVersionAndroid,
    String storeUrlIos,
    String storeUrlAndroid,
    String forceUpdateMessage) {
}
