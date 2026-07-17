package com.blockout.notifications.push.application;

import com.blockout.shared.model.DevicePlatformEnum;
import java.util.Optional;

/** Persists registration decisions without exposing JPA entities. */
public interface PushTokenRegistrationStore {

    Optional<PushTokenRegistrationTarget> findByToken(String expoPushToken);

    Optional<PushTokenRegistrationTarget> findByUserAndDevice(Long userId, String deviceId);

    void update(
            Long id,
            Long userId,
            String expoPushToken,
            DevicePlatformEnum platform,
            String deviceId);

    void create(RegisterPushTokenCommand command);

    void deleteOtherUserDeviceRegistrations(Long userId, String deviceId, Long keepId);
}
