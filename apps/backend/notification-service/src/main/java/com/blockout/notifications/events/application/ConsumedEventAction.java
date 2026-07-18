package com.blockout.notifications.events.application;

/** One local side effect governed by the transactional event claim. */
@FunctionalInterface
public interface ConsumedEventAction {

    void apply();
}
