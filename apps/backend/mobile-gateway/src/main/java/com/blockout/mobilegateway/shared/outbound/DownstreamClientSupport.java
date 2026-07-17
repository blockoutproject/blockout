package com.blockout.mobilegateway.shared.outbound;

import java.util.regex.Pattern;
import java.util.function.Supplier;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.client.HttpStatusCodeException;

/** Shared mechanics for generated downstream adapters without owning workflow policy. */
public final class DownstreamClientSupport {

    private static final Pattern VERSIONED_API_SUFFIX = Pattern.compile("/api/v[12](?:/[^/]+)?/?$");

    private DownstreamClientSupport() {
    }

    public static String canonicalRoot(String configuredUrl) {
        String normalized = configuredUrl.endsWith("/")
                ? configuredUrl.substring(0, configuredUrl.length() - 1)
                : configuredUrl;
        return VERSIONED_API_SUFFIX.matcher(normalized).replaceFirst("");
    }

    public static boolean hasUserJwt() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication instanceof JwtAuthenticationToken && authentication.isAuthenticated();
    }

    public static <T> T nullableWhenNotFound(Supplier<T> call) {
        try {
            return call.get();
        } catch (HttpStatusCodeException exception) {
            if (exception.getStatusCode().value() == HttpStatus.NOT_FOUND.value()) {
                return null;
            }
            throw exception;
        }
    }
}
