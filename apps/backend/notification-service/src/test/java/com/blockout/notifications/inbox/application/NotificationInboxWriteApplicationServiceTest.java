package com.blockout.notifications.inbox.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.shared.model.NotificationTargetTypeEnum;
import com.blockout.shared.model.NotificationTypeEnum;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class NotificationInboxWriteApplicationServiceTest {

    @Test
    void emptyInputRetainsTheExistingNoOp() {
        RecordingStore store = new RecordingStore();
        NotificationInboxWriteApplicationService service = new NotificationInboxWriteApplicationService(store);

        service.createBatch(null);
        service.createBatch(List.of());

        assertThat(store.commands).isNull();
    }

    @Test
    void snapshotsTheOrderedBatchBeforeCrossingPersistence() {
        RecordingStore store = new RecordingStore();
        NotificationInboxWriteApplicationService service = new NotificationInboxWriteApplicationService(store);
        List<CreateInboxNotificationCommand> commands = new ArrayList<>();
        commands.add(command(1L));
        commands.add(command(2L));

        service.createBatch(commands);
        commands.clear();

        assertThat(store.commands)
                .extracting(CreateInboxNotificationCommand::userId)
                .containsExactly(1L, 2L);
    }

    private CreateInboxNotificationCommand command(Long userId) {
        return new CreateInboxNotificationCommand(
                userId,
                NotificationTypeEnum.MATCH_FINISHED,
                "Title",
                "Body",
                "/match/42",
                NotificationTargetTypeEnum.MATCH,
                42L,
                JsonNodeFactory.instance.objectNode().put("divisionId", 9));
    }

    private static final class RecordingStore implements NotificationInboxWriteStore {
        private List<CreateInboxNotificationCommand> commands;

        @Override
        public void createBatch(List<CreateInboxNotificationCommand> commands) {
            this.commands = commands;
        }
    }
}
