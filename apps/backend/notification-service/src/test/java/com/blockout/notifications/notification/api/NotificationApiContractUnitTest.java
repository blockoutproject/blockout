package com.blockout.notifications.notification.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.notifications.notification.api.mappers.NotificationApiMapper;
import com.blockout.notifications.notification.api.models.NotificationInternalResponse;
import com.blockout.notifications.notification.api.models.NotificationPageInternalResponse;
import com.blockout.notifications.notification.api.models.RegisterPushTokenInternalRequest;
import com.blockout.notifications.notification.api.models.UnreadCountInternalResponse;
import com.blockout.notifications.notification.application.views.NotificationPageView;
import com.blockout.notifications.notification.application.views.NotificationView;
import com.blockout.shared.model.DevicePlatformEnum;
import com.blockout.shared.model.NotificationTargetTypeEnum;
import com.blockout.shared.model.NotificationTypeEnum;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

class NotificationApiContractUnitTest {

  private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

  @Test
  void exposesTheCompleteNotificationResourceInNativeCamelCase() {
    Instant now = Instant.parse("2026-07-19T12:00:00Z");
    NotificationInternalResponse notification =
        new NotificationInternalResponse(
                1L,
                2L,
                NotificationTypeEnum.MATCH_FINISHED,
                "Result",
                "Won",
                NotificationTargetTypeEnum.MATCH,
                false,
                false,
                now)
            .deepLink("/match/3")
            .targetId(3L)
            .metadata(objectMapper.createObjectNode().put("divisionId", 4L));

    JsonNode json = objectMapper.valueToTree(notification);

    assertThat(json.propertyNames())
        .containsExactlyInAnyOrder(
            "id",
            "userId",
            "type",
            "title",
            "body",
            "deepLink",
            "targetType",
            "targetId",
            "metadata",
            "isRead",
            "isOpened",
            "createdAt",
            "readAt",
            "openedAt");
    assertThat(json.path("metadata").path("divisionId").asLong()).isEqualTo(4L);
  }

  @Test
  void keepsPageUnreadCountAndRegistrationAsPurposeSpecificContracts() {
    NotificationPageInternalResponse page = new NotificationPageInternalResponse(List.of(), false);
    RegisterPushTokenInternalRequest registration =
        new RegisterPushTokenInternalRequest("ExponentPushToken[test]", DevicePlatformEnum.ANDROID)
            .deviceId("device-1");

    assertThat(objectMapper.valueToTree(page).propertyNames())
        .containsExactlyInAnyOrder("notifications", "hasNext", "nextPage");
    assertThat(
            objectMapper.valueToTree(new UnreadCountInternalResponse(3L)).path("unread").asLong())
        .isEqualTo(3L);
    assertThat(objectMapper.valueToTree(registration).propertyNames())
        .containsExactlyInAnyOrder("expoPushToken", "platform", "deviceId");
  }

  @Test
  void mapsApplicationEnumsAtTheGeneratedBoundary() {
    Instant now = Instant.parse("2026-07-19T12:00:00Z");
    var applicationNotification =
        new NotificationView(
            1L,
            2L,
            com.blockout.notifications.notification.application.models.NotificationType
                .MATCH_FINISHED,
            "Result",
            "Won",
            "/match/3",
            com.blockout.notifications.notification.application.models.NotificationTargetType.MATCH,
            3L,
            objectMapper.createObjectNode(),
            false,
            false,
            now,
            null,
            null);

    var response =
        Mappers.getMapper(NotificationApiMapper.class)
            .toResponse(new NotificationPageView(List.of(applicationNotification), false, null));

    assertThat(response.getNotifications())
        .singleElement()
        .satisfies(
            notification -> {
              assertThat(notification.getType()).isEqualTo(NotificationTypeEnum.MATCH_FINISHED);
              assertThat(notification.getTargetType()).isEqualTo(NotificationTargetTypeEnum.MATCH);
              assertThat(notification.getCreatedAt()).isEqualTo(now);
            });
  }
}
