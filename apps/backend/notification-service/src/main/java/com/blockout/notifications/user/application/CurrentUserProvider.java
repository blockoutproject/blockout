package com.blockout.notifications.user.application;

/** Resolves the current local Blockout user through an outbound identity adapter. */
public interface CurrentUserProvider {

    /** Returns the current local user snapshot, or null when the provider returns no body. */
    CurrentUserSnapshot getCurrentUser();
}
