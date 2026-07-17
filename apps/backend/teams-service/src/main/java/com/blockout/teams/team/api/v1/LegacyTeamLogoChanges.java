package com.blockout.teams.team.api.v1;

import com.blockout.teams.team.api.TeamLogoUploads;
import com.blockout.teams.team.application.TeamLogoChange;
import org.springframework.web.multipart.MultipartFile;

final class LegacyTeamLogoChanges {

    private LegacyTeamLogoChanges() {
    }

    static TeamLogoChange from(String logoUrl, MultipartFile image) {
        if (image != null && !image.isEmpty()) {
            return TeamLogoChange.replace(TeamLogoUploads.from(image));
        }
        return logoUrl == null ? TeamLogoChange.remove() : TeamLogoChange.keep();
    }
}
