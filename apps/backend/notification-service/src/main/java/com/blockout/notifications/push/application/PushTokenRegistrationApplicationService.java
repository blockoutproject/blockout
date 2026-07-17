package com.blockout.notifications.push.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Preserves token reattachment, device rotation, and duplicate cleanup decisions. */
@Service
@RequiredArgsConstructor
public class PushTokenRegistrationApplicationService implements PushTokenRegistration {

    private static final Logger LOGGER = LoggerFactory.getLogger(PushTokenRegistrationApplicationService.class);

    private final PushTokenRegistrationStore store;

    @Override
    @Transactional
    public void register(RegisterPushTokenCommand command) {
        var existingByToken = store.findByToken(command.expoPushToken());
        if (existingByToken.isPresent()) {
            PushTokenRegistrationTarget existing = existingByToken.get();
            String deviceId = hasDevice(command.deviceId()) ? command.deviceId() : existing.deviceId();
            store.update(
                    existing.id(), command.userId(), command.expoPushToken(), command.platform(), deviceId);
            cleanDuplicates(command.userId(), command.deviceId(), existing.id());
            LOGGER.info("Push token reattached",
                    keyValue("action", "register_push_token"),
                    keyValue("token", mask(command.expoPushToken())),
                    keyValue("fromUserId", existing.userId()),
                    keyValue("toUserId", command.userId()),
                    keyValue("platform", command.platform().name()),
                    keyValue("deviceId", command.deviceId()));
            return;
        }

        if (hasDevice(command.deviceId())) {
            var existingByDevice = store.findByUserAndDevice(command.userId(), command.deviceId());
            if (existingByDevice.isPresent()) {
                PushTokenRegistrationTarget existing = existingByDevice.get();
                store.update(
                        existing.id(), command.userId(), command.expoPushToken(), command.platform(), command.deviceId());
                cleanDuplicates(command.userId(), command.deviceId(), existing.id());
                LOGGER.info("Push token rotated (by deviceId)",
                        keyValue("action", "register_push_token"),
                        keyValue("userId", command.userId()),
                        keyValue("platform", command.platform().name()),
                        keyValue("deviceId", command.deviceId()));
                return;
            }
        }

        store.create(command);
        LOGGER.info("Push token registered",
                keyValue("action", "register_push_token"),
                keyValue("userId", command.userId()),
                keyValue("platform", command.platform().name()),
                keyValue("deviceId", command.deviceId()));
    }

    private void cleanDuplicates(Long userId, String deviceId, Long keepId) {
        if (hasDevice(deviceId)) {
            store.deleteOtherUserDeviceRegistrations(userId, deviceId, keepId);
        }
    }

    private boolean hasDevice(String deviceId) {
        return deviceId != null && !deviceId.isBlank();
    }

    private String mask(String token) {
        if (token == null || token.length() < 8) {
            return "***";
        }
        return token.substring(0, 4) + "..." + token.substring(token.length() - 4);
    }
}
