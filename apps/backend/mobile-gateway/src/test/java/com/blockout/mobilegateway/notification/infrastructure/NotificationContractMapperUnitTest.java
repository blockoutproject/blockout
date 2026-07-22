package com.blockout.mobilegateway.notification.infrastructure;

import com.blockout.mobilegateway.notification.api.models.RegisterPushTokenRequest;
import com.blockout.mobilegateway.notification.infrastructure.contract.models.NotificationInternalResponse;
import com.blockout.mobilegateway.notification.infrastructure.contract.models.NotificationPageInternalResponse;
import com.blockout.mobilegateway.notification.infrastructure.contract.models.UnreadCountInternalResponse;
import com.blockout.mobilegateway.shared.application.models.DevicePlatform;
import com.blockout.mobilegateway.shared.application.models.NotificationTargetType;
import com.blockout.mobilegateway.shared.application.models.NotificationType;
import com.blockout.shared.model.NotificationTargetTypeEnum;
import com.blockout.shared.model.NotificationTypeEnum;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationContractMapperUnitTest {

    private final NotificationContractMapper mapper = new NotificationContractMapper();

    @Test
    void mapsTheCompleteGeneratedPageToApplicationViews() {
        Instant now = Instant.parse("2026-07-19T12:00:00Z");
        var metadata = new ObjectMapper().createObjectNode().put("divisionId", 4L);
        NotificationInternalResponse notification = new NotificationInternalResponse(
            1L, 2L, NotificationTypeEnum.MATCH_FINISHED, "Result", "Won",
            NotificationTargetTypeEnum.MATCH, false, false, now)
            .deepLink("/match/3")
            .targetId(3L)
            .metadata(metadata);

        var page = mapper.toView(new NotificationPageInternalResponse(List.of(notification), false));

        assertThat(page.hasNext()).isFalse();
        assertThat(page.notifications()).singleElement().satisfies(item -> {
            assertThat(item.type()).isEqualTo(NotificationType.MATCH_FINISHED);
            assertThat(item.targetType()).isEqualTo(NotificationTargetType.MATCH);
            assertThat(item.metadata()).isEqualTo(metadata);
            assertThat(item.createdAt()).isEqualTo(now);
        });
    }

    @Test
    void mapsUnreadCountAndPushTokenBoundaries() {
        var count = mapper.toResponse(new UnreadCountInternalResponse(3L));
        var request = mapper.toInternalRequest(RegisterPushTokenRequest.builder()
            .expoPushToken("ExponentPushToken[test]")
            .platform(DevicePlatform.ANDROID)
            .deviceId("device-1")
            .build());

        assertThat(count.getUnread()).isEqualTo(3L);
        assertThat(request.getExpoPushToken()).isEqualTo("ExponentPushToken[test]");
        assertThat(request.getPlatform().name()).isEqualTo("ANDROID");
        assertThat(request.getDeviceId()).isEqualTo("device-1");
    }
}
