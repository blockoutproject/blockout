package com.blockout.notifications.push.application;

/** Registers or rotates one token while preserving the deployed device lifecycle. */
public interface PushTokenRegistration {

    void register(RegisterPushTokenCommand command);
}
