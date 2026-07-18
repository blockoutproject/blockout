package com.blockout.notifications.inbox.application;

import java.util.List;

/** Writes notification inbox entries without exposing persistence entities. */
public interface NotificationInboxWriter {

    /** Persists one ordered batch, retaining the existing empty-input no-op. */
    void createBatch(List<CreateInboxNotificationCommand> commands);
}
