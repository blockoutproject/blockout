package com.blockout.notifications.followers.application;

/** Reports whether an idempotent projection command changed derived state. */
public enum FollowerProjectionMutation {
    APPLIED,
    UNCHANGED
}
