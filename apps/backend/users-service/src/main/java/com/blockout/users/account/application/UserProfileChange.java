package com.blockout.users.account.application;

/** Carries explicit nullable-field intent from profile policy to persistence. */
public record UserProfileChange(
        String pseudo,
        boolean replacePseudo,
        String pictureUrl,
        boolean replacePicture,
        boolean active) {
}
