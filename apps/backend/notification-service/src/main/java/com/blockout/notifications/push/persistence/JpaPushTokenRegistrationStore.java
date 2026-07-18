package com.blockout.notifications.push.persistence;

import com.blockout.notifications.push.application.PushTokenRegistrationChange;
import com.blockout.notifications.push.application.PushTokenRegistrationStore;
import com.blockout.notifications.push.application.PushTokenRegistrationTarget;
import com.blockout.notifications.push.application.RegisterPushTokenCommand;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Contains JPA push-token rows behind the registration application port. */
@Component
@RequiredArgsConstructor
public class JpaPushTokenRegistrationStore implements PushTokenRegistrationStore {

    private final PushTokenRepository repository;
    private final PushTokenPersistenceMapper mapper;

    @Override
    public Optional<PushTokenRegistrationTarget> findByToken(String expoPushToken) {
        return repository.findByExpoPushToken(expoPushToken).map(mapper::toTarget);
    }

    @Override
    public Optional<PushTokenRegistrationTarget> findByUserAndDevice(Long userId, String deviceId) {
        return repository.findByUserIdAndDeviceId(userId, deviceId).map(mapper::toTarget);
    }

    @Override
    public void update(PushTokenRegistrationChange change) {
        PushTokenEntity entity = repository.findById(change.id())
                .orElseThrow(() -> new IllegalStateException("Push token disappeared during registration."));
        mapper.apply(change, entity);
        repository.save(entity);
    }

    @Override
    public void create(RegisterPushTokenCommand command) {
        repository.save(mapper.toEntity(command));
    }

    @Override
    public void deleteOtherUserDeviceRegistrations(Long userId, String deviceId, Long keepId) {
        repository.deleteOthersByUserAndDevice(userId, deviceId, keepId);
    }
}
