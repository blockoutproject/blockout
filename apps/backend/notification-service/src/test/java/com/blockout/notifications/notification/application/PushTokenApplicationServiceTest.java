package com.blockout.notifications.notification.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.blockout.notifications.notification.application.commands.RegisterPushTokenCommand;
import com.blockout.notifications.notification.application.models.DevicePlatform;
import com.blockout.notifications.notification.infrastructure.persistence.entities.PushTokenEntity;
import com.blockout.notifications.notification.infrastructure.persistence.repositories.PushTokenRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PushTokenApplicationServiceTest {

    @Mock
    private PushTokenRepository repository;

    @Test
    void registersANewDeviceWithoutChangingThePersistenceContract() {
        when(repository.findByExpoPushToken("ExponentPushToken[test]")).thenReturn(Optional.empty());
        when(repository.findByUserIdAndDeviceId(7L, "device-1")).thenReturn(Optional.empty());
        PushTokenApplicationService service = new PushTokenApplicationService(repository);

        service.register(7L, new RegisterPushTokenCommand(
                "ExponentPushToken[test]", DevicePlatform.ANDROID, "device-1"));

        ArgumentCaptor<PushTokenEntity> saved = ArgumentCaptor.forClass(PushTokenEntity.class);
        verify(repository).save(saved.capture());
        assertThat(saved.getValue().getUserId()).isEqualTo(7L);
        assertThat(saved.getValue().getExpoPushToken()).isEqualTo("ExponentPushToken[test]");
        assertThat(saved.getValue().getPlatform()).isEqualTo(DevicePlatform.ANDROID);
        assertThat(saved.getValue().getActive()).isTrue();
    }
}
