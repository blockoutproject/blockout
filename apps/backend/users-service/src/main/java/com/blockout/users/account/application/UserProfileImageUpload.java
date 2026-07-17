package com.blockout.users.account.application;

import java.util.Arrays;

/** Owns validated profile-image bytes after they leave the multipart adapter. */
public record UserProfileImageUpload(String filename, String contentType, byte[] content) {

    /** Copies transport-owned bytes into the immutable application value. */
    public UserProfileImageUpload {
        content = Arrays.copyOf(content, content.length);
    }

    /** Returns a defensive copy of the profile-image bytes. */
    @Override
    public byte[] content() {
        return Arrays.copyOf(content, content.length);
    }
}
