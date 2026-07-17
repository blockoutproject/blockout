package com.blockout.notifications.push.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.shared.model.DevicePlatformEnum;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PushTokenRegistrationApplicationServiceTest {

    private RecordingStore store;
    private PushTokenRegistrationApplicationService service;

    @BeforeEach
    void setUp() {
        store = new RecordingStore();
        service = new PushTokenRegistrationApplicationService(store);
    }

    @Test
    void existingTokenIsReattachedAndKeepsItsDeviceWhenInputIsBlank() {
        store.byToken = Optional.of(new PushTokenRegistrationTarget(10L, 1L, "old-device"));

        service.register(command(2L, "token-value", " "));

        assertThat(store.calls).containsExactly(
                "find-token:token-value",
                "update:10:2:token-value:IOS:old-device");
    }

    @Test
    void existingTokenUsesTheNewDeviceAndCleansDuplicates() {
        store.byToken = Optional.of(new PushTokenRegistrationTarget(11L, 1L, "old-device"));

        service.register(command(2L, "token-value", "new-device"));

        assertThat(store.calls).containsExactly(
                "find-token:token-value",
                "update:11:2:token-value:IOS:new-device",
                "clean:2:new-device:11");
    }

    @Test
    void existingUserDeviceRotatesTheTokenOnTheSameRegistration() {
        store.byDevice = Optional.of(new PushTokenRegistrationTarget(12L, 2L, "device"));

        service.register(command(2L, "new-token", "device"));

        assertThat(store.calls).containsExactly(
                "find-token:new-token",
                "find-device:2:device",
                "update:12:2:new-token:IOS:device",
                "clean:2:device:12");
    }

    @Test
    void unknownTokenAndDeviceCreatesOneActiveRegistration() {
        RegisterPushTokenCommand command = command(3L, "new-token", "device");

        service.register(command);

        assertThat(store.calls).containsExactly(
                "find-token:new-token",
                "find-device:3:device",
                "create:" + command);
    }

    private RegisterPushTokenCommand command(Long userId, String token, String deviceId) {
        return new RegisterPushTokenCommand(userId, token, DevicePlatformEnum.IOS, deviceId);
    }

    private static final class RecordingStore implements PushTokenRegistrationStore {
        private Optional<PushTokenRegistrationTarget> byToken = Optional.empty();
        private Optional<PushTokenRegistrationTarget> byDevice = Optional.empty();
        private final List<String> calls = new ArrayList<>();

        @Override
        public Optional<PushTokenRegistrationTarget> findByToken(String expoPushToken) {
            calls.add("find-token:" + expoPushToken);
            return byToken;
        }

        @Override
        public Optional<PushTokenRegistrationTarget> findByUserAndDevice(Long userId, String deviceId) {
            calls.add("find-device:%d:%s".formatted(userId, deviceId));
            return byDevice;
        }

        @Override
        public void update(
                Long id,
                Long userId,
                String expoPushToken,
                DevicePlatformEnum platform,
                String deviceId) {
            calls.add("update:%d:%d:%s:%s:%s".formatted(
                    id, userId, expoPushToken, platform, deviceId));
        }

        @Override
        public void create(RegisterPushTokenCommand command) {
            calls.add("create:" + command);
        }

        @Override
        public void deleteOtherUserDeviceRegistrations(Long userId, String deviceId, Long keepId) {
            calls.add("clean:%d:%s:%d".formatted(userId, deviceId, keepId));
        }
    }
}
