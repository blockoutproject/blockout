package com.blockout.notifications.notification.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.notifications.notification.api.models.NotificationInternalResponse;
import com.blockout.notifications.notification.api.models.NotificationPageInternalResponse;
import com.blockout.notifications.notification.api.models.RegisterPushTokenInternalRequest;
import com.blockout.notifications.notification.api.models.UnreadCountInternalResponse;
import com.blockout.notifications.notification.application.models.DevicePlatform;
import com.blockout.notifications.notification.application.models.NotificationTargetType;
import com.blockout.notifications.notification.application.models.NotificationType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class NotificationApiContractUnitTest {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Test
    void exposesTheCompleteNotificationResourceInNativeCamelCase() {
        Instant now = Instant.parse("2026-07-19T12:00:00Z");
        NotificationInternalResponse notification = new NotificationInternalResponse(
                1L, 2L, NotificationType.MATCH_FINISHED, "Result", "Won", "/match/3",
                NotificationTargetType.MATCH, 3L, objectMapper.createObjectNode().put("divisionId", 4L),
                false, false, now, null, null);

        JsonNode json = objectMapper.valueToTree(notification);

        assertThat(json.fieldNames()).toIterable().containsExactlyInAnyOrder(
                "id", "userId", "type", "title", "body", "deepLink", "targetType", "targetId",
                "metadata", "isRead", "isOpened", "createdAt", "readAt", "openedAt");
        assertThat(json.path("metadata").path("divisionId").asLong()).isEqualTo(4L);
    }

    @Test
    void keepsPageUnreadCountAndRegistrationAsPurposeSpecificContracts() {
        NotificationPageInternalResponse page = new NotificationPageInternalResponse(List.of(), false, null);
        RegisterPushTokenInternalRequest registration = new RegisterPushTokenInternalRequest(
                "ExponentPushToken[test]", DevicePlatform.ANDROID, "device-1");

        assertThat(objectMapper.valueToTree(page).fieldNames()).toIterable()
                .containsExactlyInAnyOrder("notifications", "hasNext", "nextPage");
        assertThat(objectMapper.valueToTree(new UnreadCountInternalResponse(3)).path("unread").asLong()).isEqualTo(3L);
        assertThat(objectMapper.valueToTree(registration).fieldNames()).toIterable()
                .containsExactlyInAnyOrder("expoPushToken", "platform", "deviceId");
    }
}
