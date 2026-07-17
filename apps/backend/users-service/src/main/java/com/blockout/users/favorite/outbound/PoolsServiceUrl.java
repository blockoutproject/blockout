package com.blockout.users.favorite.outbound;

import java.util.regex.Pattern;

final class PoolsServiceUrl {

    private static final Pattern VERSIONED_POOLS_SUFFIX = Pattern.compile("/api/v[12]/pools/?$");

    private PoolsServiceUrl() {
    }

    static String canonicalBasePath(String configuredUrl) {
        String normalized = configuredUrl.endsWith("/")
                ? configuredUrl.substring(0, configuredUrl.length() - 1)
                : configuredUrl;
        return VERSIONED_POOLS_SUFFIX.matcher(normalized).replaceFirst("");
    }
}
