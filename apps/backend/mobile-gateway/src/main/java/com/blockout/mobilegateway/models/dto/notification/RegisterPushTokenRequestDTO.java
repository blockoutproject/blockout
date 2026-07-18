package com.blockout.mobilegateway.models.dto.notification;

import com.blockout.shared.model.DevicePlatformEnum;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RegisterPushTokenRequestDTO {
    private String expoPushToken;
    private DevicePlatformEnum platform;

    private String deviceId;
}
