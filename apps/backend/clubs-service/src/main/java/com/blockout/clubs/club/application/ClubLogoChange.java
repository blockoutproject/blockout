package com.blockout.clubs.club.application;

import com.blockout.shared.model.ImageChangeModeEnum;
import com.blockout.clubs.club.domain.ClubLogoUpload;

public record ClubLogoChange(ImageChangeModeEnum mode, ClubLogoUpload upload) {

    public ClubLogoChange {
        if (mode == ImageChangeModeEnum.REPLACE && upload == null) {
            throw new IllegalArgumentException("A replacement logo is required.");
        }
        if (mode != ImageChangeModeEnum.REPLACE && upload != null) {
            throw new IllegalArgumentException("A logo upload is only valid for replacement.");
        }
    }

    public static ClubLogoChange keep() {
        return new ClubLogoChange(ImageChangeModeEnum.KEEP, null);
    }

    public static ClubLogoChange remove() {
        return new ClubLogoChange(ImageChangeModeEnum.REMOVE, null);
    }

    public static ClubLogoChange replace(ClubLogoUpload upload) {
        return new ClubLogoChange(ImageChangeModeEnum.REPLACE, upload);
    }
}
