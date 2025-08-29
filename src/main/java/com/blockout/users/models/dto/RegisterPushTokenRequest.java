package com.blockout.users.models.dto;

import com.blockout.users.models.enums.DevicePlatform;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RegisterPushTokenRequest {
    private String expoPushToken;
    private DevicePlatform platform;
    private String deviceId;
}