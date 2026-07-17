package com.blockout.notifications.push.persistence;

import com.blockout.notifications.models.entity.PushToken;
import com.blockout.notifications.models.enums.DevicePlatform;
import com.blockout.notifications.push.application.PushTokenRegistrationStore;
import com.blockout.notifications.push.application.PushTokenRegistrationTarget;
import com.blockout.notifications.push.application.RegisterPushTokenCommand;
import com.blockout.notifications.repositories.PushTokenRepository;
import com.blockout.shared.model.DevicePlatformEnum;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Contains JPA push-token rows behind the registration application port. */
@Component
@RequiredArgsConstructor
public class JpaPushTokenRegistrationStore implements PushTokenRegistrationStore {

    private final PushTokenRepository repository;

    @Override
    public Optional<PushTokenRegistrationTarget> findByToken(String expoPushToken) {
        return repository.findByExpoPushToken(expoPushToken).map(this::target);
    }

    @Override
    public Optional<PushTokenRegistrationTarget> findByUserAndDevice(Long userId, String deviceId) {
        return repository.findByUserIdAndDeviceId(userId, deviceId).map(this::target);
    }

    @Override
    public void update(
            Long id,
            Long userId,
            String expoPushToken,
            DevicePlatformEnum platform,
            String deviceId) {
        PushToken entity = repository.findById(id)
                .orElseThrow(() -> new IllegalStateException("Push token disappeared during registration."));
        entity.setUserId(userId);
        entity.setExpoPushToken(expoPushToken);
        entity.setPlatform(platform(platform));
        entity.setDeviceId(deviceId);
        entity.setActive(true);
        repository.save(entity);
    }

    @Override
    public void create(RegisterPushTokenCommand command) {
        repository.save(PushToken.builder()
                .userId(command.userId())
                .expoPushToken(command.expoPushToken())
                .platform(platform(command.platform()))
                .deviceId(command.deviceId())
                .active(true)
                .build());
    }

    @Override
    public void deleteOtherUserDeviceRegistrations(Long userId, String deviceId, Long keepId) {
        repository.deleteOthersByUserAndDevice(userId, deviceId, keepId);
    }

    private PushTokenRegistrationTarget target(PushToken entity) {
        return new PushTokenRegistrationTarget(entity.getId(), entity.getUserId(), entity.getDeviceId());
    }

    private DevicePlatform platform(DevicePlatformEnum platform) {
        return platform == null ? null : DevicePlatform.valueOf(platform.name());
    }
}
