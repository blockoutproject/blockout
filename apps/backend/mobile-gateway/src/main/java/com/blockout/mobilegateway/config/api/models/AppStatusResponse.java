package com.blockout.mobilegateway.config.api.models;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;


@Getter
@Setter
@Builder
public class AppStatusResponse {

    private boolean maintenance;
    private String message;

    private String imageUrl;

    private String minVersionIos;

    private String minVersionAndroid;

    private String storeUrlIos;

    private String storeUrlAndroid;

    private String forceUpdateMessage;

    private Instant lastUpdate;
}