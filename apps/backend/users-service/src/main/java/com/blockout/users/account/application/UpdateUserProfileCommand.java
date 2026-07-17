package com.blockout.users.account.application;

/** Carries explicit profile text and image mutation intent. */
public record UpdateUserProfileCommand(String pseudo, UserProfileImageChange imageChange) {
}
