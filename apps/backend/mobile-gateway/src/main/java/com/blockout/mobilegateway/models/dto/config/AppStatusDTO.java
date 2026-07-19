package com.blockout.mobilegateway.models.dto.config;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;


@Getter
@Setter
@Builder
public class AppStatusDTO {

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