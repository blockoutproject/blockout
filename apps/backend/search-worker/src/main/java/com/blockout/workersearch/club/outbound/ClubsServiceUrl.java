package com.blockout.workersearch.club.outbound;

import java.util.regex.Pattern;

final class ClubsServiceUrl {

    private static final Pattern VERSIONED_CLUBS_SUFFIX = Pattern.compile("/api/v[12]/clubs/?$");

    private ClubsServiceUrl() {
    }

    static String canonicalBasePath(String configuredUrl) {
        String normalized = configuredUrl.endsWith("/")
                ? configuredUrl.substring(0, configuredUrl.length() - 1)
                : configuredUrl;
        return VERSIONED_CLUBS_SUFFIX.matcher(normalized).replaceFirst("");
    }
}
