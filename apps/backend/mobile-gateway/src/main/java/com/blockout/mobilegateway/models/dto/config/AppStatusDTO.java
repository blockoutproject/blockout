package com.blockout.mobilegateway.models.dto.config;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonProperty;

@Getter
@Setter
@Builder
public class AppStatusDTO {

    private boolean maintenance;
    private String message;

    @JsonProperty("image_url")
    private String imageUrl;

    @JsonProperty("min_version_ios")
    private String minVersionIos;

    @JsonProperty("min_version_android")
    private String minVersionAndroid;

    @JsonProperty("store_url_ios")
    private String storeUrlIos;

    @JsonProperty("store_url_android")
    private String storeUrlAndroid;

    @JsonProperty("force_update_message")
    private String forceUpdateMessage;

    @JsonProperty("last_update")
    private Instant lastUpdate;
}