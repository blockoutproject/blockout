package com.blockout.notifications.user.outbound;

import java.util.regex.Pattern;

/** Normalizes historical users-service URLs to the generated client host base. */
final class UsersServiceUrl {

    private static final Pattern VERSIONED_USERS_SUFFIX = Pattern.compile("/api/v[12]/users/?$");

    private UsersServiceUrl() {
    }

    /** Removes only the known versioned users-service suffix. */
    static String canonicalBasePath(String configuredUrl) {
        String normalized = configuredUrl.endsWith("/")
                ? configuredUrl.substring(0, configuredUrl.length() - 1)
                : configuredUrl;
        return VERSIONED_USERS_SUFFIX.matcher(normalized).replaceFirst("");
    }
}
