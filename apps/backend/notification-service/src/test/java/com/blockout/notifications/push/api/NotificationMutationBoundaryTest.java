package com.blockout.notifications.push.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.notifications.generated.api.NotificationInboxMutationsApi;
import com.blockout.notifications.generated.api.NotificationPushTokensApi;
import com.blockout.notifications.generated.model.RegisterPushTokenInternalRequest;
import com.blockout.notifications.inbox.api.v2.NotificationInboxMutationsV2Controller;
import com.blockout.notifications.inbox.application.NotificationInboxMutations;
import com.blockout.notifications.push.api.v2.PushTokenApiMapper;
import com.blockout.notifications.push.api.v2.PushTokenV2Controller;
import com.blockout.notifications.push.application.PushTokenRegistration;
import com.blockout.notifications.push.application.RegisterPushTokenCommand;
import com.blockout.shared.model.DevicePlatformEnum;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.http.HttpStatus;

class NotificationMutationBoundaryTest {

    @Test
    void mutationControllerImplementsTheGeneratedFamilyAndPreservesStateSensitiveStatuses() {
        RecordingMutations mutations = new RecordingMutations();
        NotificationInboxMutationsV2Controller controller = new NotificationInboxMutationsV2Controller(mutations);

        assertThat(NotificationInboxMutationsApi.class).isAssignableFrom(controller.getClass());
        assertThat(controller.getCurrentUserUnreadNotificationCount().getBody().getUnreadCount()).isEqualTo(4L);

        mutations.changed = true;
        assertThat(controller.markCurrentUserNotificationRead(1L).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        mutations.changed = false;
        assertThat(controller.markCurrentUserNotificationOpened(2L).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(controller.deleteCurrentUserNotification(3L).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void generatedPushRequestMapsToAnApplicationCommandWithoutCaseConversion() {
        PushTokenApiMapper mapper = Mappers.getMapper(PushTokenApiMapper.class);
        RegisterPushTokenInternalRequest request =
                new RegisterPushTokenInternalRequest("ExponentPushToken[value]", DevicePlatformEnum.ANDROID, "device");

        assertThat(mapper.toCommand(8L, request)).isEqualTo(new RegisterPushTokenCommand(
                8L, "ExponentPushToken[value]", DevicePlatformEnum.ANDROID, "device"));
    }

    @Test
    void pushControllerImplementsTheGeneratedFamilyAndRetainsAcceptedStatus() {
        RecordingRegistration registration = new RecordingRegistration();
        PushTokenV2Controller controller =
                new PushTokenV2Controller(registration, Mappers.getMapper(PushTokenApiMapper.class));
        RegisterPushTokenInternalRequest request =
                new RegisterPushTokenInternalRequest("token", DevicePlatformEnum.IOS, "device");

        assertThat(NotificationPushTokensApi.class).isAssignableFrom(controller.getClass());
        assertThat(controller.registerUserPushToken(9L, request).getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
        assertThat(registration.command.userId()).isEqualTo(9L);
    }

    @Test
    void generatedPushRequestCarriesTheCanonicalValidationPolicy() {
        var validator = Validation.buildDefaultValidatorFactory().getValidator();
        var request = new RegisterPushTokenInternalRequest("", null, "");

        assertThat(validator.validate(request)).hasSize(3);
    }

    private static final class RecordingMutations implements NotificationInboxMutations {
        private boolean changed;

        @Override
        public long unreadCount() {
            return 4L;
        }

        @Override
        public boolean markRead(Long notificationId) {
            return changed;
        }

        @Override
        public boolean markOpened(Long notificationId) {
            return changed;
        }

        @Override
        public boolean delete(Long notificationId) {
            return changed;
        }
    }

    private static final class RecordingRegistration implements PushTokenRegistration {
        private RegisterPushTokenCommand command;

        @Override
        public void register(RegisterPushTokenCommand command) {
            this.command = command;
        }
    }
}
