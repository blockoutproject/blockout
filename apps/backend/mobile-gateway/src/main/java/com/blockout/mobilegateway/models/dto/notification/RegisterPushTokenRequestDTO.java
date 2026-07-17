package com.blockout.mobilegateway.models.dto.notification;

import com.blockout.mobilegateway.models.enums.DevicePlatform;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RegisterPushTokenRequestDTO {
    @JsonProperty("expo_push_token")
    private String expoPushToken;
    private DevicePlatform platform;

    @JsonProperty("device_id")
    private String deviceId;
}
