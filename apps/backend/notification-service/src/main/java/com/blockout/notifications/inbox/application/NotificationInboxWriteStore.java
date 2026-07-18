package com.blockout.notifications.inbox.application;

import java.util.List;

/** Persists application-owned inbox write commands. */
public interface NotificationInboxWriteStore {

    void createBatch(List<CreateInboxNotificationCommand> commands);
}
