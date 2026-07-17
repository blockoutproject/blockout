package com.blockout.workersearch.configuration.division.outbound;

import java.util.regex.Pattern;

final class ConfigServiceUrl {

    private static final Pattern VERSIONED_CONFIG_SUFFIX = Pattern.compile("/api/v[12]/config/?$");

    private ConfigServiceUrl() {
    }

    static String canonicalBasePath(String configuredUrl) {
        String normalized = configuredUrl.endsWith("/")
                ? configuredUrl.substring(0, configuredUrl.length() - 1)
                : configuredUrl;
        return VERSIONED_CONFIG_SUFFIX.matcher(normalized).replaceFirst("");
    }
}
