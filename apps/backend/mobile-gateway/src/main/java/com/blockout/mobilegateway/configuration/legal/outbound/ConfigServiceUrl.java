package com.blockout.mobilegateway.configuration.legal.outbound;

import java.util.regex.Pattern;

public final class ConfigServiceUrl {

    private static final Pattern VERSIONED_CONFIG_SUFFIX = Pattern.compile("/api/v[12]/config/?$");

    private ConfigServiceUrl() {
    }

    public static String canonicalBasePath(String configuredUrl) {
        return VERSIONED_CONFIG_SUFFIX.matcher(withoutTrailingSlash(configuredUrl)).replaceFirst("");
    }

    public static String legacyBasePath(String configuredUrl) {
        String normalized = withoutTrailingSlash(configuredUrl);
        if (normalized.endsWith("/api/v1/config")) {
            return normalized;
        }
        if (normalized.endsWith("/api/v2/config")) {
            return normalized.substring(0, normalized.length() - "/api/v2/config".length()) + "/api/v1/config";
        }
        return normalized + "/api/v1/config";
    }

    private static String withoutTrailingSlash(String configuredUrl) {
        return configuredUrl.endsWith("/") ? configuredUrl.substring(0, configuredUrl.length() - 1) : configuredUrl;
    }
}
