package com.blockout.notifications.inbox.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.notifications.inbox.application.NotificationInboxSnapshot;
import com.blockout.notifications.inbox.application.CreateInboxNotificationCommand;
import com.blockout.shared.model.NotificationTargetTypeEnum;
import com.blockout.shared.model.NotificationTypeEnum;
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
        NotificationInboxEntity entity = NotificationInboxEntity.builder()
                .id(11L)
                .userId(21L)
                .type(NotificationTypeEnum.MATCH_FINISHED)
                .title("Final score")
                .body("The match is complete")
                .deepLink("blockout://matches/31")
                .targetType(NotificationTargetTypeEnum.MATCH)
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
    void mapsProviderNeutralWritesToNewUnreadPersistenceRows() throws Exception {
        CreateInboxNotificationCommand command = new CreateInboxNotificationCommand(
                21L,
                NotificationTypeEnum.MATCH_FINISHED,
                "Final score",
                "The match is complete",
                "/match/31",
                NotificationTargetTypeEnum.MATCH,
                31L,
                json.readTree("{\"divisionId\":57}"));

        NotificationInboxEntity entity = mapper.toEntity(command);

        assertThat(entity.getId()).isNull();
        assertThat(entity.getUserId()).isEqualTo(21L);
        assertThat(entity.getType()).isEqualTo(NotificationTypeEnum.MATCH_FINISHED);
        assertThat(entity.getTargetType()).isEqualTo(NotificationTargetTypeEnum.MATCH);
        assertThat(entity.getIsRead()).isFalse();
        assertThat(entity.getIsOpened()).isFalse();
        assertThat(entity.getCreatedAt()).isNull();
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
