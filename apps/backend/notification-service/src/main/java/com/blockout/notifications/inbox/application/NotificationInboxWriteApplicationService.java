package com.blockout.notifications.inbox.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Owns notification inbox batch-write transaction and logging. */
@Service
@RequiredArgsConstructor
public class NotificationInboxWriteApplicationService implements NotificationInboxWriter {

    private static final Logger LOGGER = LoggerFactory.getLogger(NotificationInboxWriteApplicationService.class);

    private final NotificationInboxWriteStore store;

    @Override
    @Transactional
    public void createBatch(List<CreateInboxNotificationCommand> commands) {
        if (commands == null || commands.isEmpty()) {
            return;
        }
        List<CreateInboxNotificationCommand> ownedCommands = List.copyOf(commands);
        store.createBatch(ownedCommands);
        LOGGER.info("Notification inbox batch created",
                keyValue("action", "notification_inbox_create_batch"),
                keyValue("count", ownedCommands.size()));
    }
}
