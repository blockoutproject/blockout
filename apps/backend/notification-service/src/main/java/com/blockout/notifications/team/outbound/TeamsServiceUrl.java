package com.blockout.notifications.team.outbound;

import java.util.regex.Pattern;

final class TeamsServiceUrl {

    private static final Pattern VERSIONED_TEAMS_SUFFIX = Pattern.compile("/api/v[12]/teams/?$");

    private TeamsServiceUrl() {
    }

    static String canonicalBasePath(String configuredUrl) {
        String normalized = configuredUrl.endsWith("/")
                ? configuredUrl.substring(0, configuredUrl.length() - 1)
                : configuredUrl;
        return VERSIONED_TEAMS_SUFFIX.matcher(normalized).replaceFirst("");
    }
}
