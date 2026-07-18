package com.blockout.notifications.push.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.notifications.push.application.PushTokenRegistrationChange;
import com.blockout.notifications.push.application.RegisterPushTokenCommand;
import com.blockout.shared.model.DevicePlatformEnum;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class PushTokenPersistenceMapperTest {

    private final PushTokenPersistenceMapper mapper = Mappers.getMapper(PushTokenPersistenceMapper.class);

    @Test
    void createsOneActiveTokenRowFromTheApplicationCommand() {
        PushTokenEntity entity = mapper.toEntity(
                new RegisterPushTokenCommand(7L, "token", DevicePlatformEnum.IOS, "device"));

        assertThat(entity.getId()).isNull();
        assertThat(entity.getUserId()).isEqualTo(7L);
        assertThat(entity.getExpoPushToken()).isEqualTo("token");
        assertThat(entity.getPlatform()).isEqualTo(DevicePlatformEnum.IOS);
        assertThat(entity.getDeviceId()).isEqualTo("device");
        assertThat(entity.getActive()).isTrue();
        assertThat(entity.getCreatedAt()).isNull();
        assertThat(entity.getLastUpdate()).isNull();
    }

    @Test
    void appliesRegistrationChangesWithoutReplacingPersistenceIdentityOrTimestamps() {
        PushTokenEntity entity = PushTokenEntity.builder()
                .id(3L)
                .userId(1L)
                .expoPushToken("old")
                .platform(DevicePlatformEnum.ANDROID)
                .deviceId("old-device")
                .active(false)
                .createdAt(java.time.LocalDateTime.MIN)
                .lastUpdate(java.time.LocalDateTime.MIN)
                .build();

        mapper.apply(new PushTokenRegistrationChange(
                99L, 2L, "new", DevicePlatformEnum.IOS, "new-device"), entity);

        assertThat(entity.getId()).isEqualTo(3L);
        assertThat(entity.getUserId()).isEqualTo(2L);
        assertThat(entity.getExpoPushToken()).isEqualTo("new");
        assertThat(entity.getPlatform()).isEqualTo(DevicePlatformEnum.IOS);
        assertThat(entity.getDeviceId()).isEqualTo("new-device");
        assertThat(entity.getActive()).isTrue();
        assertThat(entity.getCreatedAt()).isEqualTo(java.time.LocalDateTime.MIN);
        assertThat(entity.getLastUpdate()).isEqualTo(java.time.LocalDateTime.MIN);
    }
}
