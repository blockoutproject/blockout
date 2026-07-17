package com.blockout.mobilegateway.configuration.legal.outbound;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ConfigServiceUrlTest {

    @Test
    void derivesCanonicalBaseFromHostOrVersionedConfigUrl() {
        assertThat(ConfigServiceUrl.canonicalBasePath("https://config.example"))
                .isEqualTo("https://config.example");
        assertThat(ConfigServiceUrl.canonicalBasePath("https://config.example/api/v1/config/"))
                .isEqualTo("https://config.example");
        assertThat(ConfigServiceUrl.canonicalBasePath("https://config.example/api/v2/config"))
                .isEqualTo("https://config.example");
    }

    @Test
    void derivesLegacyBaseWithoutDuplicatingConfiguredPath() {
        assertThat(ConfigServiceUrl.legacyBasePath("https://config.example"))
                .isEqualTo("https://config.example/api/v1/config");
        assertThat(ConfigServiceUrl.legacyBasePath("https://config.example/api/v1/config/"))
                .isEqualTo("https://config.example/api/v1/config");
        assertThat(ConfigServiceUrl.legacyBasePath("https://config.example/api/v2/config"))
                .isEqualTo("https://config.example/api/v1/config");
    }
}
