package com.blockout.clubs.club.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class ClubLogoUploadTest {

    @Test
    void ownsImmutableSupportedImageBytes() {
        byte[] source = {1, 2};
        ClubLogoUpload upload = new ClubLogoUpload("logo.png", "image/png", source);

        source[0] = 9;
        byte[] exposed = upload.content();
        exposed[1] = 9;

        assertThat(upload.content()).containsExactly(1, 2);
        assertThatThrownBy(() -> new ClubLogoUpload("logo.gif", "image/gif", new byte[]{1}))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("PNG");
    }

    @Test
    void rejectsOversizedImages() {
        assertThatThrownBy(() -> new ClubLogoUpload(
                "large.jpg", "image/jpeg", new byte[(5 * 1024 * 1024) + 1]))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("5 Mo");
    }
}
