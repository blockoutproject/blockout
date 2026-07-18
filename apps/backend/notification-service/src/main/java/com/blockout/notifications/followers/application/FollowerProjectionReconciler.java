package com.blockout.notifications.followers.application;

/** Reconciles one bounded canonical favorite snapshot without owning its acquisition. */
public interface FollowerProjectionReconciler {

    FollowerProjectionReconciliation reconcile(FollowerProjectionSnapshot snapshot);
}
