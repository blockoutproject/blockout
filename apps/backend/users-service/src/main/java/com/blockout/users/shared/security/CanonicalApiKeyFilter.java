package com.blockout.users.shared.security;

import com.blockout.users.config.AuthProperties;
import com.blockout.users.shared.api.v2.UsersSecurityProblemWriter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.web.filter.OncePerRequestFilter;

/** Enforces the exact internal API key while returning canonical v2 Problem Details. */
@RequiredArgsConstructor
public class CanonicalApiKeyFilter extends OncePerRequestFilter {

    private final AuthProperties properties;
    private final UsersSecurityProblemWriter problems;

    /** Validates the key before the generated internal identity controller executes. */
    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        String supplied = request.getHeader("X-API-KEY");
        if (supplied == null) {
            problems.writeApiKeyUnauthorized(request, response, "The internal API key is required.");
            return;
        }
        if (!supplied.equals(properties.getApiKey())) {
            problems.writeApiKeyUnauthorized(request, response, "The internal API key is invalid.");
            return;
        }
        chain.doFilter(request, response);
    }
}
