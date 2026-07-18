package com.blockout.teams.team.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class TeamLogoUploadTest {

    @Test
    void acceptsPngAndDefensivelyCopiesItsContent() {
        byte[] content = {1, 2};

        TeamLogoUpload upload = new TeamLogoUpload("logo.png", "image/png", content);
        content[0] = 9;
        byte[] returned = upload.content();
        returned[1] = 9;

        assertThat(upload.content()).containsExactly(1, 2);
    }

    @Test
    void rejectsUnsupportedMediaTypesAndOversizedContent() {
        assertThatThrownBy(() -> new TeamLogoUpload("logo.gif", "image/gif", new byte[] {1}))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("PNG et JPEG");
        assertThatThrownBy(() -> new TeamLogoUpload(
                "logo.png", "image/png", new byte[5 * 1024 * 1024 + 1]))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("5 Mo");
    }
}
