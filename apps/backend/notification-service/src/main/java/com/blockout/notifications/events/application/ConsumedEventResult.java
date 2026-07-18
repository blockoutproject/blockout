package com.blockout.notifications.events.application;

/** Makes the listener's AUTO acknowledgement outcome explicit. */
public enum ConsumedEventResult {
    APPLIED,
    DUPLICATE
}
