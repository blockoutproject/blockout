package com.blockout.clubs.club.application;

import com.blockout.clubs.club.domain.ClubLogoUpload;

public record ClubLogoChange(Mode mode, ClubLogoUpload upload) {

    public enum Mode {
        KEEP,
        REMOVE,
        REPLACE
    }

    public ClubLogoChange {
        if (mode == Mode.REPLACE && upload == null) {
            throw new IllegalArgumentException("A replacement logo is required.");
        }
        if (mode != Mode.REPLACE && upload != null) {
            throw new IllegalArgumentException("A logo upload is only valid for replacement.");
        }
    }

    public static ClubLogoChange keep() {
        return new ClubLogoChange(Mode.KEEP, null);
    }

    public static ClubLogoChange remove() {
        return new ClubLogoChange(Mode.REMOVE, null);
    }

    public static ClubLogoChange replace(ClubLogoUpload upload) {
        return new ClubLogoChange(Mode.REPLACE, upload);
    }
}
