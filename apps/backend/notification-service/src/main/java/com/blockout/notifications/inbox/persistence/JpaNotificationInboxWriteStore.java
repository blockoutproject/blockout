package com.blockout.notifications.inbox.persistence;

import com.blockout.notifications.inbox.application.CreateInboxNotificationCommand;
import com.blockout.notifications.inbox.application.NotificationInboxWriteStore;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Adapts provider-neutral inbox writes to JPA rows. */
@Component
@RequiredArgsConstructor
public class JpaNotificationInboxWriteStore implements NotificationInboxWriteStore {

    private final NotificationInboxRepository repository;
    private final NotificationInboxPersistenceMapper mapper;

    @Override
    public void createBatch(List<CreateInboxNotificationCommand> commands) {
        repository.saveAll(commands.stream().map(mapper::toEntity).toList());
    }
}
