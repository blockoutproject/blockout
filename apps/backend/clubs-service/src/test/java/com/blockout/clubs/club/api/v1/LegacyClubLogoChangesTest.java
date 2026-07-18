package com.blockout.clubs.club.api.v1;

import com.blockout.shared.model.ImageChangeModeEnum;
import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.clubs.club.application.ClubLogoChange;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class LegacyClubLogoChangesTest {

    @Test
    void preservesTheLegacyNullRemoveNonNullKeepAndImageReplaceTruthTable() {
        assertThat(LegacyClubLogoChanges.from(null, null).mode()).isEqualTo(ImageChangeModeEnum.REMOVE);
        assertThat(LegacyClubLogoChanges.from("keep-marker", null).mode()).isEqualTo(ImageChangeModeEnum.KEEP);

        MockMultipartFile image = new MockMultipartFile("image", "logo.png", "image/png", new byte[]{1});
        ClubLogoChange replacement = LegacyClubLogoChanges.from(null, image);

        assertThat(replacement.mode()).isEqualTo(ImageChangeModeEnum.REPLACE);
        assertThat(replacement.upload().filename()).isEqualTo("logo.png");
    }
}
