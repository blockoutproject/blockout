package com.blockout.notifications.models.dto.pushTokens;

import com.blockout.notifications.models.enums.DevicePlatform;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RegisterPushTokenRequest {
    private String expoPushToken;
    private DevicePlatform platform;
    private String deviceId;
}