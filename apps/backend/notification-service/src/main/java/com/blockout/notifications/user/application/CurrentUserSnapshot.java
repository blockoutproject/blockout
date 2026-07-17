package com.blockout.notifications.user.application;

/** Carries only the local identity required by notification ownership. */
public record CurrentUserSnapshot(Long id) {
}
