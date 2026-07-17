package com.blockout.notifications.inbox.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.notifications.generated.api.NotificationInboxMutationsApi;
import com.blockout.notifications.generated.api.NotificationInboxPagesApi;
import com.blockout.notifications.generated.api.NotificationPushTokensApi;
import com.blockout.notifications.generated.model.NotificationInternalResponse;
import com.blockout.notifications.inbox.api.v1.LegacyNotificationMapper;
import com.blockout.notifications.inbox.api.v1.LegacyNotificationPageResponse;
import com.blockout.notifications.inbox.api.v1.LegacyNotificationsJson;
import com.blockout.notifications.inbox.api.v2.NotificationInboxApiMapper;
import com.blockout.notifications.inbox.api.v2.NotificationInboxV2Controller;
import com.blockout.notifications.inbox.application.NotificationInboxPage;
import com.blockout.notifications.inbox.application.NotificationInboxSnapshot;
import com.blockout.notifications.models.enums.DevicePlatform;
import com.blockout.shared.model.NotificationTargetTypeEnum;
import com.blockout.shared.model.NotificationTypeEnum;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class NotificationInboxBoundaryTest {

    private final NotificationInboxSnapshot snapshot = new NotificationInboxSnapshot(
            11L,
            21L,
            NotificationTypeEnum.MATCH_FINISHED,
            "Final score",
            "The match is complete",
            "blockout://matches/31",
            NotificationTargetTypeEnum.MATCH,
            31L,
            new ObjectMapper().createObjectNode().put("divisionId", 57),
            57L,
            true,
            false,
            Instant.parse("2026-07-17T10:00:00Z"),
            Instant.parse("2026-07-17T10:01:00Z"),
            null);

    @Test
    void controllerImplementsOnlyTheInboxPageInterfaceOwnedByThisSlice() {
        assertThat(NotificationInboxPagesApi.class).isAssignableFrom(NotificationInboxV2Controller.class);
        assertThat(NotificationInboxMutationsApi.class.isAssignableFrom(NotificationInboxV2Controller.class))
                .isFalse();
        assertThat(NotificationPushTokensApi.class.isAssignableFrom(NotificationInboxV2Controller.class))
                .isFalse();
    }

    @Test
    void canonicalMapperProjectsOnlyTheApprovedGeneratedView() {
        NotificationInboxApiMapper mapper = Mappers.getMapper(NotificationInboxApiMapper.class);

        NotificationInternalResponse result = mapper.toResponse(snapshot);

        assertThat(result.getId()).isEqualTo(11L);
        assertThat(result.getType()).isEqualTo(NotificationTypeEnum.MATCH_FINISHED);
        assertThat(result.getDeepLink()).isEqualTo("blockout://matches/31");
        assertThat(result.getDivisionId()).isEqualTo(57L);
        assertThat(result.getIsRead()).isTrue();
        assertThat(result.getIsOpened()).isFalse();
        assertThat(result.getCreatedAt()).isEqualTo(Instant.parse("2026-07-17T10:00:00Z"));
    }

    @Test
    void legacyJsonRetainsTheEntityShapedSnakeCasePageAndContinuation() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules()
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        LegacyNotificationMapper mapper = Mappers.getMapper(LegacyNotificationMapper.class);
        LegacyNotificationsJson legacyJson = new LegacyNotificationsJson(objectMapper);
        LegacyNotificationPageResponse response = mapper.toResponse(
                new NotificationInboxPage(List.of(snapshot), 4, 10, true));

        JsonNode result = objectMapper.readTree(legacyJson.write(response));

        assertThat(result.get("has_next").asBoolean()).isTrue();
        assertThat(result.get("next_page").asInt()).isEqualTo(5);
        JsonNode item = result.get("notifications").get(0);
        assertThat(item.get("user_id").asLong()).isEqualTo(21L);
        assertThat(item.get("deep_link").asText()).isEqualTo("blockout://matches/31");
        assertThat(item.get("target_type").asText()).isEqualTo("MATCH");
        assertThat(item.get("target_id").asLong()).isEqualTo(31L);
        assertThat(item.get("is_read").asBoolean()).isTrue();
        assertThat(item.get("is_opened").asBoolean()).isFalse();
        assertThat(item.get("read_at").asText()).isEqualTo("2026-07-17T10:01:00Z");
        assertThat(item.has("division_id")).isFalse();
    }

    @Test
    void legacyPushTokenInputRemainsSnakeCaseInsideTheLocalAdapter() throws Exception {
        LegacyNotificationsJson legacyJson =
                new LegacyNotificationsJson(new ObjectMapper().findAndRegisterModules());

        var result = legacyJson.readPushToken(
                "{\"expo_push_token\":\"ExponentPushToken[value]\",\"platform\":\"IOS\",\"device_id\":\"phone-1\"}");

        assertThat(result.expoPushToken()).isEqualTo("ExponentPushToken[value]");
        assertThat(result.platform()).isEqualTo(DevicePlatform.IOS);
        assertThat(result.deviceId()).isEqualTo("phone-1");
    }
}
