package com.blockout.teams.team.application;

import com.blockout.shared.model.ImageChangeModeEnum;
import com.blockout.teams.team.domain.TeamLogoUpload;

public record TeamLogoChange(ImageChangeModeEnum mode, TeamLogoUpload upload) {

    public TeamLogoChange {
        if (mode == ImageChangeModeEnum.REPLACE && upload == null) {
            throw new IllegalArgumentException("A replacement logo is required.");
        }
        if (mode != ImageChangeModeEnum.REPLACE && upload != null) {
            throw new IllegalArgumentException("A logo upload is only valid for replacement.");
        }
    }

    public static TeamLogoChange keep() {
        return new TeamLogoChange(ImageChangeModeEnum.KEEP, null);
    }

    public static TeamLogoChange remove() {
        return new TeamLogoChange(ImageChangeModeEnum.REMOVE, null);
    }

    public static TeamLogoChange replace(TeamLogoUpload upload) {
        return new TeamLogoChange(ImageChangeModeEnum.REPLACE, upload);
    }
}
