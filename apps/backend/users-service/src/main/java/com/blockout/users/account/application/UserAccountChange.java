package com.blockout.users.account.application;

/** Carries immutable before/after account state for audit logging and response projection. */
public record UserAccountChange(UserAccountView before, UserAccountView after) {
}
