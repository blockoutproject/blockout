package com.blockout.config.shared.api.v1;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class LegacyConfigJsonTest {

    private final LegacyConfigJson json = new LegacyConfigJson();

    @Test
    void isolatesLegacySnakeCaseWithoutAnnotations() throws Exception {
        String body = json.write(new LegacyShape("https://image", "2.0"));

        assertThat(body).isEqualTo("{\"image_url\":\"https://image\",\"min_version_ios\":\"2.0\"}");
        assertThat(json.read("{\"image_url\":\"legacy\"}", LegacyShape.class).imageUrl())
                .isEqualTo("legacy");
    }

    record LegacyShape(String imageUrl, String minVersionIos) {
    }
}
