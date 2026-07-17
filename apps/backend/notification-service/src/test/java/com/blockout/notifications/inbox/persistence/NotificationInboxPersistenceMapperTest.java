package com.blockout.notifications.inbox.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.notifications.inbox.application.NotificationInboxSnapshot;
import com.blockout.notifications.models.entity.UserNotification;
import com.blockout.notifications.models.enums.NotificationTargetType;
import com.blockout.notifications.models.enums.NotificationType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class NotificationInboxPersistenceMapperTest {

    private final NotificationInboxPersistenceMapper mapper =
            Mappers.getMapper(NotificationInboxPersistenceMapper.class);
    private final ObjectMapper json = new ObjectMapper();

    @Test
    void mapsPersistenceFieldsAndDerivesTheCanonicalDivisionIdentity() throws Exception {
        JsonNode metadata = json.readTree("{\"divisionId\":\"57\",\"source\":\"legacy\"}");
        Instant createdAt = Instant.parse("2026-07-17T10:00:00Z");
        UserNotification entity = UserNotification.builder()
                .id(11L)
                .userId(21L)
                .type(NotificationType.MATCH_FINISHED)
                .title("Final score")
                .body("The match is complete")
                .deepLink("blockout://matches/31")
                .targetType(NotificationTargetType.MATCH)
                .targetId(31L)
                .metadata(metadata)
                .isRead(true)
                .isOpened(false)
                .createdAt(createdAt)
                .build();

        NotificationInboxSnapshot result = mapper.toSnapshot(entity);

        assertThat(result.id()).isEqualTo(11L);
        assertThat(result.userId()).isEqualTo(21L);
        assertThat(result.type().name()).isEqualTo("MATCH_FINISHED");
        assertThat(result.targetType().name()).isEqualTo("MATCH");
        assertThat(result.divisionId()).isEqualTo(57L);
        assertThat(result.createdAt()).isEqualTo(createdAt);
        assertThat(result.metadata()).isEqualTo(metadata);
    }

    @Test
    void acceptsOnlyPositiveIntegralOrNumericTextDivisionIdentities() throws Exception {
        assertThat(mapper.divisionId(json.readTree("{\"divisionId\":8}"))).isEqualTo(8L);
        assertThat(mapper.divisionId(json.readTree("{\"divisionId\":\"9\"}"))).isEqualTo(9L);
        assertThat(mapper.divisionId(json.readTree("{\"divisionId\":0}"))).isNull();
        assertThat(mapper.divisionId(json.readTree("{\"divisionId\":\"bad\"}"))).isNull();
        assertThat(mapper.divisionId(json.readTree("{\"divisionId\":1.5}"))).isNull();
        assertThat(mapper.divisionId(json.readTree("{}"))).isNull();
        assertThat(mapper.divisionId(null)).isNull();
    }

    @Test
    void snapshotsDefensivelyOwnLegacyMetadata() throws Exception {
        JsonNode source = json.readTree("{\"divisionId\":12}");
        NotificationInboxSnapshot snapshot = new NotificationInboxSnapshot(
                1L, 2L, null, "title", "body", null, null, null, source, 12L,
                false, false, Instant.EPOCH, null, null);

        ((com.fasterxml.jackson.databind.node.ObjectNode) source).put("divisionId", 99);
        assertThat(snapshot.metadata().get("divisionId").asLong()).isEqualTo(12L);

        ((com.fasterxml.jackson.databind.node.ObjectNode) snapshot.metadata()).put("divisionId", 100);
        assertThat(snapshot.metadata().get("divisionId").asLong()).isEqualTo(12L);
    }
}
