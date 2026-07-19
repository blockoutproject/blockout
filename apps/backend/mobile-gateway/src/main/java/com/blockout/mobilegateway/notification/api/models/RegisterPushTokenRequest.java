package com.blockout.mobilegateway.notification.api.models;

import com.blockout.mobilegateway.shared.application.models.DevicePlatform;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RegisterPushTokenRequest {
    private String expoPushToken;
    private DevicePlatform platform;
    private String deviceId;
}