package com.blockout.teams.team.application;

import com.blockout.teams.team.domain.TeamLogoUpload;

public record TeamLogoChange(Mode mode, TeamLogoUpload upload) {

    public enum Mode {
        KEEP,
        REMOVE,
        REPLACE
    }

    public TeamLogoChange {
        if (mode == Mode.REPLACE && upload == null) {
            throw new IllegalArgumentException("A replacement logo is required.");
        }
        if (mode != Mode.REPLACE && upload != null) {
            throw new IllegalArgumentException("A logo upload is only valid for replacement.");
        }
    }

    public static TeamLogoChange keep() {
        return new TeamLogoChange(Mode.KEEP, null);
    }

    public static TeamLogoChange remove() {
        return new TeamLogoChange(Mode.REMOVE, null);
    }

    public static TeamLogoChange replace(TeamLogoUpload upload) {
        return new TeamLogoChange(Mode.REPLACE, upload);
    }
}
