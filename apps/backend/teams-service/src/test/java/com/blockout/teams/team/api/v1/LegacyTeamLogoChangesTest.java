package com.blockout.teams.team.api.v1;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.teams.team.application.TeamLogoChange;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class LegacyTeamLogoChangesTest {

    @Test
    void absentImageAndNullLogoRemoveTheStoredLogo() {
        assertThat(LegacyTeamLogoChanges.from(null, null).mode()).isEqualTo(TeamLogoChange.Mode.REMOVE);
    }

    @Test
    void imageAlwaysReplacesAndNonNullLegacyUrlKeeps() {
        MockMultipartFile image = new MockMultipartFile("image", "logo.png", "image/png", new byte[]{1});

        assertThat(LegacyTeamLogoChanges.from("ignored", image).mode()).isEqualTo(TeamLogoChange.Mode.REPLACE);
        assertThat(LegacyTeamLogoChanges.from("https://current", null).mode()).isEqualTo(TeamLogoChange.Mode.KEEP);
    }
}
