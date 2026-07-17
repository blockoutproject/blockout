package com.blockout.users.account.application;

/** Makes profile-image preservation, removal, and replacement explicit. */
public record UserProfileImageChange(Mode mode, UserProfileImageUpload upload) {

    /** Supported profile-image mutations. */
    public enum Mode {
        KEEP,
        REMOVE,
        REPLACE
    }

    /** Enforces that only replacement carries image bytes. */
    public UserProfileImageChange {
        if (mode == Mode.REPLACE && upload == null) {
            throw new IllegalArgumentException("A replacement profile image is required.");
        }
        if (mode != Mode.REPLACE && upload != null) {
            throw new IllegalArgumentException("A profile image upload is only valid for replacement.");
        }
    }

    /** Creates an intent that preserves the stored picture. */
    public static UserProfileImageChange keep() {
        return new UserProfileImageChange(Mode.KEEP, null);
    }

    /** Creates an intent that removes the stored picture. */
    public static UserProfileImageChange remove() {
        return new UserProfileImageChange(Mode.REMOVE, null);
    }

    /** Creates an intent that replaces the stored picture. */
    public static UserProfileImageChange replace(UserProfileImageUpload upload) {
        return new UserProfileImageChange(Mode.REPLACE, upload);
    }
}
