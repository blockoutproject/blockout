package com.blockout.matches.match.live.outbound;

import java.util.regex.Pattern;

final class UsersServiceUrl {

    private static final Pattern VERSIONED_USERS_SUFFIX = Pattern.compile("/api/v[12]/users/?$");

    private UsersServiceUrl() {
    }

    static String canonicalBasePath(String configuredUrl) {
        String normalized = configuredUrl.endsWith("/")
                ? configuredUrl.substring(0, configuredUrl.length() - 1)
                : configuredUrl;
        return VERSIONED_USERS_SUFFIX.matcher(normalized).replaceFirst("");
    }
}
