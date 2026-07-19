package com.blockout.mobilegateway.models.dto.config;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AppStatusUpdateDTO {

    private Boolean maintenance;
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
}