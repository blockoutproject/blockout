package com.blockout.mobilegateway.models.dto.notification;

import com.blockout.mobilegateway.models.enums.DevicePlatform;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RegisterPushTokenRequestDTO {
    private String expoPushToken;
    private DevicePlatform platform;
    private String deviceId;
}