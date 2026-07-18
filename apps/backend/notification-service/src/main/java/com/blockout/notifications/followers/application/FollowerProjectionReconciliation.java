package com.blockout.notifications.followers.application;

import java.util.Set;

/** Reports the bounded differences applied from one canonical snapshot. */
public record FollowerProjectionReconciliation(
        Set<FollowerProjectionTarget> added,
        Set<FollowerProjectionTarget> removed,
        Set<FollowerProjectionTarget> retained) {

    public FollowerProjectionReconciliation {
        added = Set.copyOf(added);
        removed = Set.copyOf(removed);
        retained = Set.copyOf(retained);
    }
}
