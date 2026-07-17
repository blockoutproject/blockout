package com.blockout.outbox;

/** Application-facing boundary for creating and atomically recording one outbox fact. */
public interface OutboxRecorder {

    OutboxMetadata newMetadata();

    void record(OutboxEvent event);
}
