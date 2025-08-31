package com.blockout.workernotifications.models.dto.pushTokens;

import com.blockout.workernotifications.models.enums.DevicePlatform;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RegisterPushTokenRequest {
    private String expoPushToken;
    private DevicePlatform platform;
    private String deviceId;
}